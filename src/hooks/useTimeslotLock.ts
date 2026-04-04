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

export function useTimeslotLock(photographerId: string | null, lockDurationMins = 10) {
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
      // Check if slot is still available (no active lock by others)
      const now = new Date().toISOString()

      const { data: existing } = await supabase
        .from('timeslot_locks')
        .select('id, session_token')
        .eq('photographer_id', photographerId)
        .eq('slot_date', date)
        .eq('slot_time', time)
        .gt('expires_at', now)
        .maybeSingle()

      if (existing && existing.session_token !== sessionToken) {
        setState(prev => ({
          ...prev,
          isLocking: false,
          lockError: 'This slot was just taken. Please choose another.',
        }))
        return false
      }

      // Also check if slot is already booked
      const { data: booked } = await supabase
        .from('bookings')
        .select('id')
        .eq('photographer_id', photographerId)
        .eq('slot_date', date)
        .eq('slot_time', time)
        .not('status', 'eq', 'CANCELLED')
        .maybeSingle()

      if (booked) {
        setState(prev => ({
          ...prev,
          isLocking: false,
          lockError: 'This slot is already booked.',
        }))
        return false
      }

      const expiresAt = new Date(Date.now() + lockDurationMins * 60 * 1000)

      const { data: lock, error } = await supabase
        .from('timeslot_locks')
        .insert({
          photographer_id: photographerId,
          slot_date: date,
          slot_time: time,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (error) throw error

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
  }, [photographerId, lockDurationMins])

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
