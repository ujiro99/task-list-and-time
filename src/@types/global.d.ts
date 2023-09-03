import { Time } from '@/models/time'

type TrackingState = {
  key: string
  nodeId: string
  isTracking: boolean
  trackingStartTime: number /** [milli second] */
  elapsedTime: Time /* The elapsed time from the start of tracking. */
  line: number
}

type TimeObject = {
  _seconds: number
  _minutes: number
  _hours: number
  _days: number
}

interface IClonable<T> {
  clone(): T
}
