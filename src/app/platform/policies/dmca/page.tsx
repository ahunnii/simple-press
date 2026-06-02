import Link from "next/link";

const contactEmail =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ??
  "csdt@generativejustice.org";

export default function DmcaPage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress DMCA Policy</h1>

      <p>
        <strong>Last Updated:</strong> May 29, 2026
      </p>

      <h2>1. Introduction</h2>
      <p>
        THE CENTER FOR GENERATIVE JUSTICE LLC (&ldquo;SimplePress,&rdquo;
        &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects the
        intellectual property rights of others and expects users of the
        SimplePress platform to do the same.
      </p>
      <p>
        This Digital Millennium Copyright Act (&ldquo;DMCA&rdquo;) Policy
        explains how copyright owners may report allegedly infringing content
        hosted on the SimplePress platform and how we respond to such reports.
      </p>
      <p>This Policy applies to:</p>
      <ul>
        <li>simplepress.dev;</li>
        <li>storefronts hosted on SimplePress;</li>
        <li>subdomains and custom domains connected to the platform;</li>
        <li>
          user-uploaded content hosted through SimplePress infrastructure.
        </li>
      </ul>
      <hr />

      <h2>2. Reporting Copyright Infringement</h2>
      <p>
        If you believe that content hosted on SimplePress infringes your
        copyright, you may submit a written DMCA takedown notice to our
        designated DMCA contact.
      </p>
      <p>Your notice should include the following information:</p>
      <ol>
        <li>Your full legal name and contact information;</li>
        <li>
          A description of the copyrighted work you claim has been infringed;
        </li>
        <li>
          The specific URL or location of the allegedly infringing material;
        </li>
        <li>
          A statement that you have a good-faith belief that the disputed use is
          not authorized by the copyright owner, its agent, or the law;
        </li>
        <li>
          A statement, under penalty of perjury, that the information in the
          notice is accurate and that you are authorized to act on behalf of the
          copyright owner;
        </li>
        <li>Your physical or electronic signature.</li>
      </ol>
      <p>DMCA notices should be sent to:</p>
      <p>
        DMCA Agent
        <br />
        THE CENTER FOR GENERATIVE JUSTICE LLC
        <br />
        2635 Alex Dr
        <br />
        Ann Arbor, MI 48103
        <br />
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
      <hr />

      <h2>3. Response to DMCA Notices</h2>
      <p>Upon receiving a valid DMCA notice, SimplePress may:</p>
      <ul>
        <li>remove or disable access to allegedly infringing content;</li>
        <li>notify the affected user or business;</li>
        <li>investigate the reported material;</li>
        <li>suspend or terminate repeat infringers;</li>
        <li>take additional enforcement action where appropriate.</li>
      </ul>
      <p>
        We reserve the right to remove content that appears to infringe
        intellectual property rights even in cases where a formal DMCA notice
        has not been submitted.
      </p>
      <hr />

      <h2>4. Counter-Notifications</h2>
      <p>
        If you believe your content was removed or disabled in error, you may
        submit a counter-notification.
      </p>
      <p>Your counter-notification must include:</p>
      <ol>
        <li>Your name, address, telephone number, and email address;</li>
        <li>
          Identification of the material that was removed and its prior
          location;
        </li>
        <li>
          A statement under penalty of perjury that you have a good-faith belief
          the material was removed due to mistake or misidentification;
        </li>
        <li>
          A statement consenting to the jurisdiction of the federal court
          located in Michigan;
        </li>
        <li>Your physical or electronic signature.</li>
      </ol>
      <p>Counter-notifications should be sent to:</p>
      <p>
        DMCA Agent
        <br />
        THE CENTER FOR GENERATIVE JUSTICE LLC
        <br />
        2635 Alex Dr
        <br />
        Ann Arbor, MI 48103
        <br />
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
      <p>
        If we receive a valid counter-notification, we may restore the removed
        content unless the original complainant files a court action within the
        time period required by applicable law.
      </p>
      <hr />

      <h2>5. Repeat Infringer Policy</h2>
      <p>
        SimplePress reserves the right to suspend or terminate accounts,
        storefronts, domains, or platform access for users or businesses that
        repeatedly infringe intellectual property rights.
      </p>
      <p>
        We may also restrict future access to users previously removed for
        repeated infringement.
      </p>
      <hr />

      <h2>6. Misrepresentations</h2>
      <p>
        Submitting knowingly false or misleading DMCA notices or
        counter-notifications may result in legal liability.
      </p>
      <p>
        Users should ensure that all notices are submitted in good faith and
        with proper authority.
      </p>
      <hr />

      <h2>7. Platform Role</h2>
      <p>
        SimplePress is a software and infrastructure platform that allows
        independent businesses to host storefronts and upload content.
      </p>
      <p>
        SimplePress does not pre-screen all uploaded material and does not
        independently verify ownership or licensing rights for user-submitted
        content.
      </p>
      <p>
        Users and businesses remain solely responsible for the content they
        upload, publish, or distribute through the platform.
      </p>
      <hr />

      <h2>8. Reservation of Rights</h2>
      <p>SimplePress reserves the right to:</p>
      <ul>
        <li>investigate intellectual property complaints;</li>
        <li>remove content at our discretion;</li>
        <li>disable storefronts or accounts;</li>
        <li>cooperate with rights holders and law enforcement;</li>
        <li>preserve records related to infringement claims;</li>
        <li>
          take any action necessary to protect the platform and intellectual
          property rights.
        </li>
      </ul>
      <hr />

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update or modify this DMCA Policy at any time as the platform
        evolves.
      </p>
      <p>
        Updated versions become effective upon posting unless otherwise stated.
      </p>
      <p>
        Continued use of the platform after updates constitutes acceptance of
        the revised policy.
      </p>
      <hr />

      <h2>10. Contact Information</h2>
      <p>
        DMCA Agent
        <br />
        THE CENTER FOR GENERATIVE JUSTICE LLC
        <br />
        2635 Alex Dr
        <br />
        Ann Arbor, MI 48103
        <br />
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>

      <hr />
      <p className="text-sm text-gray-500">
        Related policies:{" "}
        <Link href="/platform/policies/terms-of-service">Terms of Service</Link>{" "}
        &middot;{" "}
        <Link href="/platform/policies/privacy-policy">Privacy Policy</Link>{" "}
        &middot;{" "}
        <Link href="/platform/policies/acceptable-use">
          Acceptable Use Policy
        </Link>
      </p>
    </div>
  );
}
