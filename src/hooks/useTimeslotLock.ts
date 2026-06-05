import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getSessionToken } from '../lib/utils'

interface TimeslotLockState {
  lockedDate: string | null
  lockedTime: string | null
  expiresAt: Date | null
  secondsRemaining: number
  isLocking: boolean
  lockError: string | null
}

export function useTimeslotLock(photographerId: string | null, lockDurationMins = 10, bookingDurationMins = 60) {
  const [state, setState] = useState<TimeslotLockState>({
    lockedDate: null,
    lockedTime: null,
    expiresAt: null,
    secondsRemaining: 0,
    isLocking: false,
    lockError: null,
  })

  const lockIdRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown tick
  useEffect(() => {
    if (!state.expiresAt) return

    timerRef.current = setInterval(() => {
      const now = new Date()
      const diff = Math.max(0, Math.floor((state.expiresAt!.getTime() - now.getTime()) / 1000))
      setState(prev => ({ ...prev, secondsRemaining: diff }))
      if (diff === 0) {
        clearInterval(timerRef.current!)
        setState(prev => ({
          ...prev,
          lockedDate: null,
          lockedTime: null,
          expiresAt: null,
          secondsRemaining: 0,
        }))
        lockIdRef.current = null
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state.expiresAt])

  const sessionToken = getSessionToken()

  const releaseLockById = useCallback(async (lockId: string) => {
    await supabase.rpc('release_timeslot_lock', {
      p_lock_id: lockId,
      p_session_token: sessionToken,
    })
  }, [sessionToken])

  const lockSlot = useCallback(async (date: string, time: string) => {
    if (!photographerId) return false

    // Release previous lock if any
    if (lockIdRef.current) {
      await releaseLockById(lockIdRef.current)
      lockIdRef.current = null
    }

    setState(prev => ({ ...prev, isLocking: true, lockError: null }))

    try {
      // Use atomic RPC with rate limiting + duration-aware overlap checking
      const { data: lock, error } = await supabase.rpc('acquire_timeslot_lock', {
        p_photographer_id: photographerId,
        p_slot_date: date,
        p_slot_time: time,
        p_session_token: sessionToken,
        p_lock_duration_mins: lockDurationMins,
        p_booking_duration_mins: bookingDurationMins,
      })

      if (error) {
        const msg = error.message || ''
        if (msg.includes('Too many lock attempts') || msg.includes('Too many active locks')) {
          setState(prev => ({ ...prev, isLocking: false, lockError: msg }))
        } else if (msg.includes('already booked') || msg.includes('already taken')) {
          setState(prev => ({ ...prev, isLocking: false, lockError: 'This slot is already taken. Please choose another.' }))
        } else {
          setState(prev => ({ ...prev, isLocking: false, lockError: 'Failed to reserve slot. Please try again.' }))
        }
        return false
      }

      const expiresAt = new Date(Date.now() + lockDurationMins * 60 * 1000)
      lockIdRef.current = lock.id

      setState({
        lockedDate: date,
        lockedTime: time,
        expiresAt,
        secondsRemaining: lockDurationMins * 60,
        isLocking: false,
        lockError: null,
      })

      return true
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLocking: false,
        lockError: 'Failed to reserve slot. Please try again.',
      }))
      return false
    }
  }, [photographerId, lockDurationMins, bookingDurationMins, sessionToken, releaseLockById])

  const releaseLock = useCallback(async () => {
    if (lockIdRef.current) {
      await releaseLockById(lockIdRef.current)
      lockIdRef.current = null
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setState({
      lockedDate: null,
      lockedTime: null,
      expiresAt: null,
      secondsRemaining: 0,
      isLocking: false,
      lockError: null,
    })
  }, [releaseLockById])

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (lockIdRef.current) {
        releaseLockById(lockIdRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getLockId = () => lockIdRef.current

  return { ...state, lockSlot, releaseLock, getLockId }
}
