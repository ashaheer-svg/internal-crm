import Link from "next/link"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">ActiveIMS</h1>
        <p className="text-gray-600">Hardware Inventory Management</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
