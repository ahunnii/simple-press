import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Section,
  Text,
} from "@react-email/components";

type EmailLayoutProps = {
  children: React.ReactNode;
  previewText: string;
  businessName?: string;
  logoUrl?: string;
  footerText?: string;
};

export function EmailLayout({
  children,
  previewText,
  businessName,
  logoUrl,
  footerText,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Logo/Header */}
          {logoUrl ? (
            <Section style={header}>
              <Img src={logoUrl} alt={businessName} style={logo} />
            </Section>
          ) : businessName ? (
            <Section style={header}>
              <Text style={brandName}>{businessName}</Text>
            </Section>
          ) : null}

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerTextStyle}>
              {footerText ??
                `© ${new Date().getFullYear()} ${businessName ?? ""}. All rights reserved.`}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
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

const header = {
  padding: "32px 24px",
  textAlign: "center" as const,
};

const logo = {
  margin: "0 auto",
  height: "48px",
};

const brandName = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0",
};

const content = {
  padding: "0 24px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  padding: "0 24px",
};

const footerTextStyle = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "24px",
  textAlign: "center" as const,
};
