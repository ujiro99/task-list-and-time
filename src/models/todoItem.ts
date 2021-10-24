import Log from '@/services/log'
import { Time }from '@/models/time'

const TODO_STATE = {
  STOP: "STOP",
  RUNNING: "RUNNING",
  COMPLETE: "COMPLETE",
}

type TodoState = typeof TODO_STATE[keyof typeof TODO_STATE]

export class TodoItem {
  // for unique Id
  public static taskId = 0

  // utility for creating unique Id
  static getId(): number {
    this.taskId++
    return this.taskId
  }

  public static parse(todoStr: string): TodoItem {
    const todoRegexp = /(\[\s\]|\[x\])\s(.+)(~(\d+d)?(\d+h)?(\d+m)?)?\s(#.+)?/
    if (todoRegexp.test(todoStr)) {
      const m = todoRegexp.exec(todoStr);
      const title = m[2]
      const timeStr = m[3]
      const time = TodoItem.parseTime(timeStr)
      return new TodoItem(title, time);
    }

    Log.w("Can't find todo item")
    return new TodoItem("", new Time());
  }

  private static parseTime(todoStr: string): Time {
    const timeRegexp = /~((\d+d)?(\d+h)?(\d+m)?)\s/
    if (timeRegexp.test(todoStr)) {
      const m = timeRegexp.exec(todoStr)
      if (m[1]) {
        return Time.parseStr(m[1]);
      }
    }
    Log.w(`can't find time: ${todoStr}`)
    return new Time();
  }

  public id: number
  public title: string
  public todoState: TodoState
  public estimatedTimes: Time
  public actualTimes: Time

  /** millis */
  private trackingStartTime: number;

  constructor(title: string, time: Time) {
    this.id = TodoItem.getId()
    this.title = title
    this.todoState = TODO_STATE.STOP
    this.trackingStartTime = 0;
    this.estimatedTimes = time
  }

  trackingStart(): void {
    this.trackingStartTime = Date.now()
    this.todoState = TODO_STATE.RUNNING
  }

  trackingEnd(): void {
    const elapsedTimeMs = Date.now() - this.trackingStartTime
    const elapsedTime = Time.parseMs(elapsedTimeMs)
    this.actualTimes.add(elapsedTime)
    this.todoState = TODO_STATE.STOP
    this.trackingStartTime = 0
  }

  complete(): void {
    this.todoState = TODO_STATE.COMPLETE;
  }
}

