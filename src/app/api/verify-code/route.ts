export async function POST(req: Request) {
  const { invitationCode } = await req.json();

  // Check against env variable
  if (invitationCode !== process.env.INVITATION_CODE) {
    return Response.json({ error: "Invalid invitation code" }, { status: 400 });
  }

  return Response.json({ valid: true });
}
