function App() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-cyan-400">HotRadar</h1>
        <p className="text-gray-400">热点雷达 — 仪表盘加载中...</p>
        <div className="mt-8">
          <a
            href="/api/health"
            className="text-sm text-cyan-500 underline underline-offset-2 hover:text-cyan-300"
          >
            检查后端连接
          </a>
        </div>
      </div>
    </main>
  );
}

export default App;
