import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type NewReviewEmailProps = {
  reviewerName: string;
  productName: string;
  rating: number;
  reviewTitle?: string;
  reviewText: string;
  businessName: string;
  businessLogoUrl?: string;
  adminReviewsUrl: string;
};

export default function NewReviewEmail({
  reviewerName,
  productName,
  rating,
  reviewTitle,
  reviewText,
  businessName,
  businessLogoUrl,
  adminReviewsUrl,
}: NewReviewEmailProps) {
  const stars = "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
  const truncatedReview =
    reviewText.length > 300
      ? `${reviewText.slice(0, 300).trimEnd()}…`
      : reviewText;

  return (
    <EmailLayout
      previewText={`New ${rating}-star review for ${productName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>New product review</Text>
      <Text style={paragraph}>
        <strong>{reviewerName}</strong> left a review for{" "}
        <strong>{productName}</strong>.
      </Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Rating</Text>
        <Text style={ratingValue}>
          {stars} <span style={ratingNumber}>({rating}/5)</span>
        </Text>

        {reviewTitle && (
          <>
            <Text style={infoLabel}>Title</Text>
            <Text style={infoValue}>{reviewTitle}</Text>
          </>
        )}

        <Text style={infoLabel}>Review</Text>
        <Text style={reviewValue}>{truncatedReview}</Text>
      </Section>

      <Text style={pendingNote}>
        This review is pending approval and will not appear on your storefront
        until you approve it.
      </Text>

      <Section style={buttonSection}>
        <Button href={adminReviewsUrl} style={button}>
          Review submission
        </Button>
      </Section>

      <Text style={note}>
        This is an automated notification from your store.
      </Text>
    </EmailLayout>
  );
}

const heading = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1f2937",
  marginBottom: "16px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  marginBottom: "24px",
};

const infoBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const infoLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "8px 0 2px 0",
};

const infoValue = {
  fontSize: "15px",
  color: "#1f2937",
  margin: "0 0 8px 0",
};

const ratingValue = {
  fontSize: "20px",
  color: "#f59e0b",
  margin: "0 0 8px 0",
};

const ratingNumber = {
  fontSize: "14px",
  color: "#6b7280",
};

const reviewValue = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#374151",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const pendingNote = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#92400e",
  backgroundColor: "#fef9c3",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

const buttonSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const note = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  textAlign: "center" as const,
};
