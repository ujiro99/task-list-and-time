import React, { useEffect, CSSProperties } from 'react'
import classnames from 'classnames'

import Log from '@/services/log'
import { useTaskManager } from '@/hooks/useTaskManager'
import { useTrackingState } from '@/hooks/useTrackingState'
import { Task } from '@/models/task'
import { Counter, CounterStopped } from '@/components/Counter'
import { Checkbox } from '@/components/Checkbox'
import { TaskController } from '@/components/TaskController'
import { LineEditor } from '@/components/LineEditor'
import { useEditable } from '@/hooks/useEditable'

import '@/components/TaskItem.css'

export type TaskCheckBox = {
  checked: boolean
  disabled: boolean
}

type TaskItemProps = {
  checkboxProps: TaskCheckBox
  line: number
  style?: CSSProperties
}

export const TaskItem: React.FC<TaskItemProps> = (
  props: TaskItemProps,
): JSX.Element => {
  const checkboxProps = props.checkboxProps
  const line = props.line
  const manager = useTaskManager()
  const { trackings, addTracking, removeTracking, stopOtherTracking } =
    useTrackingState()
  const [isEditing, focusOrEdit] = useEditable(line)
  const tracking = trackings.find((n) => n.line === line)
  const node = manager.getNodeByLine(line)
  const task = node.data as Task
  const id = `check-${task.id}`
  const isRunning = task.isRunning()

  useEffect(() => {
    if (isRunning) {
      // stop previous task.
      stopOtherTracking(line)
    }
  }, [isRunning, line])

  const toggleItemCompletion = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()

    const checked = e.target.checked
    Log.d(`checkbox clicked at ${line} to ${checked ? 'true' : 'false'}`)

    const newNode = node.clone()
    const newTask = newNode.data as Task

    if (isTracking()) {
      // If task has been tracking, stop automatically.
      chrome.runtime.sendMessage({ command: 'stopTracking' })
      removeTracking(line)
      newTask.trackingStop(tracking.trackingStartTime)
    }
    newTask.setComplete(checked)

    manager.setNodeByLine(newNode, line)
  }

  const startTracking = (e: React.SyntheticEvent) => {
    e.stopPropagation()

    // Clone the objects for updating.
    const newNode = node.clone()
    const newTask = newNode.data as Task

    // start new task.
    const trackingStartTime = newTask.trackingStart()
    const newTracking = {
      line: line,
      isTracking: true,
      trackingStartTime: trackingStartTime,
      elapsedTime: newTask.actualTimes,
    }
    addTracking(newTracking)
    chrome.runtime.sendMessage({
      command: 'startTracking',
      param: newTask.actualTimes.toMinutes(),
    })

    manager.setNodeByLine(newNode, line)
  }

  const stopTracking = (e: React.SyntheticEvent) => {
    e.stopPropagation()

    if (isTracking()) {
      chrome.runtime.sendMessage({ command: 'stopTracking' })
      removeTracking(line)

      // Clone the objects for updating.
      const newNode = node.clone()
      const newTask = newNode.data as Task
      newTask.trackingStop(tracking.trackingStartTime)
      manager.setNodeByLine(newNode, line)
    }
  }

  const onClick = () => {
    if (isTracking()) return
    focusOrEdit()
  }

  const isTracking = () => {
    if (tracking == null) return false
    return tracking.isTracking
  }

  Log.v(`${line} ${id} ${isTracking() ? 'tracking' : 'stop'}`)

  const taskItemClass = classnames(
    {
      'task-item--running': isTracking(),
    },
    ['task-item', 'focus:bg-indigo-50'],
  )

  const style = {
    ...props.style,
  }

  if (isEditing) {
    return <LineEditor className="indent-[10px]" line={line} />
  }

  return (
    <div
      tabIndex={0}
      className={taskItemClass}
      style={style}
      data-line={line}
      onClick={onClick}
    >
      <div className="task-item__label">
        <Checkbox
          id={id}
          checked={checkboxProps.checked}
          onChange={toggleItemCompletion}
        />
        <span className="flex-grow ml-2">{task.title}</span>
      </div>
      {isTracking() ? (
        <Counter startTime={tracking.elapsedTime} />
      ) : !task.actualTimes.isEmpty() ? (
        <CounterStopped startTime={task.actualTimes} />
      ) : (
        <div></div>
      )}
      <TaskController
        onClickStart={startTracking}
        onClickStop={stopTracking}
        isTracking={isTracking()}
        isComplete={task.isComplete()}
      />
    </div>
  )
}
