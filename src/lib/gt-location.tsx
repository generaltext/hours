// The location bridge: keeps the router and the General Text shell in step, so a
// refresh restores the view you were on, any view can be linked or bookmarked, and
// browser back/forward step through the app instead of skipping over it.
//
// The shell owns the page URL and mirrors what we report into its fragment
// (`…/app/hours#/…`). Both halves are optional-guarded: `setLocation` /
// `onLocation` are absent on older runtimes, and `setLocation` is a no-op when the
// app runs standalone — there the hash already IS the real URL and the router does
// the whole job by itself.
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'

export function GtLocation() {
  const location = useLocation()
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const path = location.pathname + location.search

  // Where we currently are, readable from the subscription callback without making
  // the subscription depend on it (see below).
  const pathRef = useRef(path)
  // Set by the shell→app half so the app→shell half doesn't bounce the same location
  // straight back — that would announce a move the shell just made to us.
  const fromShell = useRef<string | null>(null)
  // The first location is the app's own default, and the shell may still be
  // delivering a deep link. Announcing '/' over it would drop the user's
  // destination, so the initial location is observed, not announced.
  const announced = useRef(false)

  useEffect(() => {
    pathRef.current = path
  }, [path])

  // Shell → app: the boot deep link (replayed to every new subscriber, so late
  // registration never misses it), refresh restores, and back/forward. Subscribe
  // ONCE: re-subscribing per navigation would replay the boot location again and
  // fight the user's own navigation.
  useEffect(() => {
    const gt = window.gt
    if (!gt?.onLocation) return
    return gt.onLocation((next) => {
      if (next === pathRef.current) return
      fromShell.current = next
      navigate(next, { replace: true })
    })
  }, [navigate])

  // App → shell. `push` only on a real navigation: a REPLACE or a POP must not mint
  // a new history entry, or back would walk a trail the user never made.
  useEffect(() => {
    const gt = window.gt
    if (!gt?.setLocation) return
    if (fromShell.current === path) {
      fromShell.current = null
      announced.current = true
      return
    }
    if (!announced.current) {
      announced.current = true
      return
    }
    gt.setLocation(path, { push: navigationType === 'PUSH' })
  }, [path, navigationType])

  return null
}
