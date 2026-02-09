import { db } from "~/server/db";

export default async function DebugPage() {
  const businesses = await db.business.findMany({
    select: {
      id: true,
      name: true,
      subdomain: true,
      customDomain: true,
      status: true,
      templateId: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">Database Debug</h1>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Businesses ({businesses.length})
          </h2>

          {businesses.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>No businesses found in database.</p>
              <p className="mt-2">
                Create one at{" "}
                <a href="/signup" className="text-blue-600 hover:underline">
                  localhost:3000/signup
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {businesses.map((business) => (
                <div key={business.id} className="rounded border p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-semibold">Name:</div>
                    <div>{business.name}</div>

                    <div className="font-semibold">Subdomain:</div>
                    <div>
                      <a
                        href={`http://${business.subdomain}.localhost:3000`}
                        className="text-blue-600 hover:underline"
                        target="_blank"
                      >
                        {business.subdomain}.localhost:3000
                      </a>
                    </div>

                    <div className="font-semibold">Custom Domain:</div>
                    <div>{business.customDomain ?? "None"}</div>

                    <div className="font-semibold">Status:</div>
                    <div>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          business.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {business.status}
                      </span>
                    </div>

                    <div className="font-semibold">Template:</div>
                    <div>{business.templateId}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
