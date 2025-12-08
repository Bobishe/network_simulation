import { useNotification } from '../contexts/NotificationContext'
import { useAppSelector } from '../hooks'

export default function StatusBar() {
  const { notification } = useNotification()
  const { addingType } = useAppSelector(state => state.network)

  return (
    <div className="fixed bottom-0 left-20 right-0 h-10 bg-white border-t flex items-center px-2 z-20">
      <div className="flex items-center gap-2">
        {addingType === 'link' && (
          <div className="bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
            <span>Режим создания связей активен</span>
          </div>
        )}
      </div>
      <div className="ml-auto flex items-center">
        {notification && (
          <div
            className={`text-sm px-3 py-1 rounded ${
              notification.type === 'success'
                ? 'text-green-700 bg-green-50'
                : 'text-red-700 bg-red-50'
            }`}
          >
            {notification.message}
          </div>
        )}
      </div>
    </div>
  )
}
