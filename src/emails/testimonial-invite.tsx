import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface TestimonialInviteEmailProps {
  businessName: string;
  inviteUrl: string;
}

export function TestimonialInviteEmail({
  businessName,
  inviteUrl,
}: TestimonialInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Share your experience with {businessName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>We&apos;d love your feedback!</Heading>

          <Text style={text}>Hi there,</Text>

          <Text style={text}>
            We hope you had a great experience with {businessName}. We&apos;d be
            thrilled if you could take a moment to share your thoughts!
          </Text>

          <Text style={text}>
            Your testimonial will help us improve and help others learn about
            what we do.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={inviteUrl}>
              Share Your Experience
            </Button>
          </Section>

          <Text style={footer}>
            This link is valid for 30 days and can only be used once.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0 40px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
  padding: "0 40px",
};

const buttonContainer = {
  padding: "27px 0 27px",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#5e6ad2",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 40px",
};
