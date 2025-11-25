export function SkeletonMessage() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-bl-none animate-pulse">
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonChatList() {
  return (
    <div className="space-y-2 px-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg animate-pulse"
        >
          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full shrink-0"></div>
          <div className="flex-1">
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
