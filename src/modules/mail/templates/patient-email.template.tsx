import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';

export interface PatientEmailTemplateProps {
  clinicName: string;
  clinicPhone: string | null;
  clinicAddress: string | null;
  subject: string;
  bodyText: string;
}

const ACCENT_STRIP_COLORS = [
  '#322f9c',
  '#4543ae',
  '#5c59e8',
  '#8886ec',
  '#bebdf6',
];

const main = {
  backgroundColor: '#f4f4fb',
  fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
  padding: '40px 16px',
};

const container = {
  maxWidth: '540px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 24px 64px -24px rgba(38, 36, 122, 0.28)',
};

const accentCell = {
  height: '6px',
  fontSize: '0',
  lineHeight: '0',
};

const header = {
  background: 'linear-gradient(135deg, #6a67ee 0%, #5c59e8 45%, #322f9c 100%)',
  backgroundColor: '#5c59e8',
  padding: '32px 32px 28px',
};

const logoBadge = {
  display: 'inline-block',
  width: '40px',
  height: '40px',
  lineHeight: '40px',
  borderRadius: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.16)',
  textAlign: 'center' as const,
  fontSize: '20px',
  verticalAlign: 'middle',
};

const clinicNameCell = {
  paddingLeft: '12px',
  verticalAlign: 'middle',
};

const clinicNameStyle = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 700,
  lineHeight: '24px',
  margin: 0,
};

const content = {
  padding: '36px 32px 28px',
};

const eyebrow = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: '#8886ec',
  margin: '0 0 10px',
};

const heading = {
  fontSize: '22px',
  lineHeight: '30px',
  fontWeight: 700,
  color: '#1a1a2e',
  margin: '0 0 20px',
};

const paragraphStyle = {
  fontSize: '15px',
  lineHeight: '25px',
  color: '#40405c',
  margin: '0 0 16px',
};

const footer = {
  backgroundColor: '#f7f7fc',
  padding: '24px 32px 28px',
  borderTop: '1px solid #eeeef7',
};

const footerClinicName = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#40405c',
  margin: '0 0 4px',
};

const footerText = {
  fontSize: '12px',
  lineHeight: '20px',
  color: '#8a8aa3',
  margin: '2px 0',
};

const splitParagraphs = (text: string): string[] =>
  text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

// Static split of one fixed string per render — line order never changes, so an index key is safe here.
const Paragraph = ({ text }: { text: string }) => (
  <Text style={paragraphStyle}>
    {text.split('\n').map((line, lineIndex, lines) => (
      <span key={line + String(lineIndex)}>
        {line}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    ))}
  </Text>
);

export const PatientEmailTemplate = ({
  clinicName,
  clinicPhone,
  clinicAddress,
  subject,
  bodyText,
}: PatientEmailTemplateProps) => {
  const paragraphs = splitParagraphs(bodyText);

  return (
    <Html lang="ru">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Row>
            {ACCENT_STRIP_COLORS.map((color) => (
              <Column
                key={color}
                style={{ ...accentCell, backgroundColor: color }}
              >
                &nbsp;
              </Column>
            ))}
          </Row>

          <Section style={header}>
            <Row>
              <Column style={{ width: '40px' }}>
                <div style={logoBadge}>🦷</div>
              </Column>
              <Column style={clinicNameCell}>
                <Text style={clinicNameStyle}>{clinicName}</Text>
              </Column>
            </Row>
          </Section>

          <Section style={content}>
            <Text style={eyebrow}>Сообщение от клиники</Text>
            <Heading style={heading}>{subject}</Heading>
            {paragraphs.map((paragraph) => (
              <Paragraph key={paragraph} text={paragraph} />
            ))}
          </Section>

          <Section style={footer}>
            <Text style={footerClinicName}>{clinicName}</Text>
            {clinicAddress ? (
              <Text style={footerText}>📍 {clinicAddress}</Text>
            ) : null}
            {clinicPhone ? (
              <Text style={footerText}>☎ {clinicPhone}</Text>
            ) : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
