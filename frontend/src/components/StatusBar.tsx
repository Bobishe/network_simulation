import { Toaster } from 'react-hot-toast'

export default function StatusBar() {
  return (
    <div className="fixed bottom-0 left-0 w-full h-10 bg-white border-t flex items-center px-2 z-20">
      <div className="flex items-center gap-2">
        {/* Здесь можно добавить дополнительную информацию слева */}
      </div>
      <div className="ml-auto">
        <Toaster
          position="bottom-right"
          containerStyle={{
            bottom: '10px',
            right: '8px',
          }}
          toastOptions={{
            duration: 3000,
            style: {
              maxWidth: '500px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </div>
  )
}
