import { useAppDispatch, useAppSelector } from '../hooks'
import {
  closeDeleteConfirmation,
  removeElement,
} from '../features/network/networkSlice'
import toast from 'react-hot-toast'

export default function DeleteConfirmationDialog() {
  const dispatch = useAppDispatch()
  const confirmation = useAppSelector(state => state.network.deleteConfirmation)

  if (!confirmation) return null

  const { elementId, elementType, label } = confirmation
  const title = label ? `Удалить «${label}»?` : 'Удалить выбранный объект?'
  const description =
    elementType === 'node'
      ? 'Связанные соединения и интерфейсы также будут удалены.'
      : 'Связанные данные также будут удалены.'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => dispatch(closeDeleteConfirmation())}
    >
      <div
        className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 flex flex-col gap-4"
        onClick={event => event.stopPropagation()}
      >
        <div className="text-lg font-semibold text-gray-900">{title}</div>
        <p className="text-sm text-gray-600">{description}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm border rounded"
            onClick={() => dispatch(closeDeleteConfirmation())}
          >
            Отмена
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700"
            onClick={() => {
              dispatch(removeElement(elementId))
              dispatch(closeDeleteConfirmation())
              toast.success('Объект удалён')
            }}
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}
