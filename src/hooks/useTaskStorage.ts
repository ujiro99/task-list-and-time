import { useEffect } from 'react'
import { atom, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import {
  nodeState,
  allRecordsState,
  TaskRecordType,
  TaskRecordArray,
} from '@/hooks/useTaskManager'
import { taskRecordKeyState } from '@/hooks/useTaskRecordKey'
import { STORAGE_KEY, Storage } from '@/services/storage'
import Log from '@/services/log'
import { TaskRecordKey } from '@/models/taskRecordKey'
import { Node, nodeToString } from '@/models/node'
import { sleep } from '@/services/util'

export const isPossibleToSaveState = atom<boolean>({
  key: 'isPossibleToSaveState',
  default: true,
})

export const savingState = atom<boolean>({
  key: 'savingState',
  default: false,
})

export const updateRecords = (
  records: TaskRecordArray,
  key: TaskRecordKey,
  root: Node,
): TaskRecordArray => {
  let found = false
  const data = nodeToString(root)
  const newRecords = records.map((r) => {
    if (r.key === key.toKey()) {
      found = true
      return {
        ...r,
        data,
      }
    } else {
      return r
    }
  })
  if (!found) {
    const r = {
      key: key.toKey(),
      type: TaskRecordType.Date,
      data,
    }
    newRecords.push(r)
  }
  return newRecords
}

export const loadRecords = async (): Promise<TaskRecordArray> => {
  const records =
    ((await Storage.get(STORAGE_KEY.TASK_LIST_TEXT)) as TaskRecordArray) || []
  Log.d('loadRecords', records)
  return records
}

export const saveRecords = async (
  records: TaskRecordArray,
): Promise<boolean> => {
  Log.d('saveRecords', records)
  try {
    const res = await Storage.set(STORAGE_KEY.TASK_LIST_TEXT, records)
    return res === true
  } catch (e) {
    Log.w(e)
    return false
  }
}

export function useTaskStorage(): void {
  const [records, setRecords] = useRecoilState(allRecordsState)
  const key = useRecoilValue(taskRecordKeyState)
  const root = useRecoilValue(nodeState)
  const setSaving = useSetRecoilState(savingState)
  const isPossibleToSave = useRecoilValue(isPossibleToSaveState)

  useEffect(() => {
    if (isPossibleToSave) {
      void saveToStorage()
    }
  }, [root])

  const saveToStorage = async () => {
    setSaving(true)
    const newRecords = updateRecords(records, key, root)
    setRecords(newRecords)
    await sleep(1000)
    setSaving(false)
  }
}
