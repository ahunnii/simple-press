export function DNSInstructions({ domain }: { domain: string }) {
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async () => {
    setChecking(true);
    const response = await fetch("/api/domain/verify", {
      method: "POST",
      body: JSON.stringify({ domain }),
    });

    const { verified } = await response.json();
    setVerified(verified);
    setChecking(false);

    if (verified) {
      // Domain is ready, trigger adding to Coolify
      await fetch("/api/domain/activate", {
        method: "POST",
        body: JSON.stringify({ domain }),
      });
    }
  };

  return (
    <div className="rounded border p-4">
      <h4>DNS Setup for {domain}</h4>
      <p className="mb-4 text-sm text-gray-600">
        Add these records at your domain registrar (GoDaddy, Namecheap, etc.):
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">Type</th>
            <th className="py-2 text-left">Name</th>
            <th className="py-2 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-2">A</td>
            <td className="py-2">@</td>
            <td className="py-2 font-mono">{process.env.VPS_IP}</td>
          </tr>
          <tr>
            <td className="py-2">A</td>
            <td className="py-2">www</td>
            <td className="py-2 font-mono">{process.env.VPS_IP}</td>
          </tr>
        </tbody>
      </table>

      <Button onClick={handleVerify} loading={checking} className="mt-4">
        {verified ? "Verified ✓" : "Check DNS"}
      </Button>

      {verified && (
        <p className="mt-2 text-green-600">
          DNS configured correctly! Your domain will be ready in a few minutes.
        </p>
      )}
    </div>
  );
}
