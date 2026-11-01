import type { Shape } from "../../translate";
import type ar from "../ar/legal";

const legal: Shape<typeof ar> = {
  footer: {
    privacy: "Privacy policy",
    terms: "Terms of use",
    support: "Support",
    zoomGuide: "Zoom guide",
    rights: "All rights reserved, {owner}",
  },
  updated: "Last updated: {date}",
  contents: "Contents",
  contact: {
    title: "Contact us",
    text: "For any question or request, email us and we'll reply within two business days:",
  },
  privacy: {
    title: "Privacy policy",
    description: "How the platform collects, uses and protects your data, and your rights over it.",
    intro:
      "{owner} operates this platform from the Arab Republic of Egypt. Teachers and learning centers use it to manage their students, courses and live sessions. This policy explains what data we collect, why, who we share it with, and how you can exercise your rights. By using the platform you agree to this policy.",
    sections: {
      collect: {
        title: "Data we collect",
        body: "- Account data: your name, email address, phone number if you add one, and your password, which we store as a one-way hash that no one can read.\n- Data added by a center or teacher: students and guardians, courses, session times, attendance, exams and grades, messages, and files uploaded to the library.\n- Technical data: IP address, browser type, sign-in and error logs, used to protect accounts and fix problems.\n- Data from services you choose to connect, such as Zoom and Google, described in the next section.",
      },
      zoom: {
        title: "Zoom data",
        body: "When a teacher connects their Zoom account, we receive, with their consent, only the following:\n\n- Their Zoom user ID and email address, to show which account is connected and to disconnect it if they remove the app from Zoom.\n- OAuth access and refresh tokens, stored encrypted, used to create, update and delete the meetings for the teacher's sessions on their own account.\n- Meeting start and end times, to show students whether a session is live or over.\n- The email address of participants signed in to Zoom when they join, to record attendance for the student whose platform email matches.\n\nWe do not access meeting recordings, meeting chats, contacts or any other meetings on the teacher's account. We do not sell Zoom data or use it for anything other than running sessions. When the account is disconnected on the platform or the app is removed from Zoom, we delete the tokens and account details immediately.",
      },
      use: {
        title: "How we use data",
        body: "- To run the platform: accounts, live sessions, attendance, exams, reports, the library and messaging.\n- To send the notifications and emails users need, such as session reminders and password resets.\n- To protect accounts and prevent abuse.\n- To answer support requests. Our support team enters a center only with the explicit consent of the center's administration, and only for a limited time.\n\nWe do not use your data for advertising and we never sell it.",
      },
      share: {
        title: "Who we share data with",
        body: "- Within a center: a center's administrators see their center's data, teachers see their students, and students see only their own data. No center can see another center's data.\n- Service providers we rely on to run the platform, such as hosting and email delivery, only as far as needed to provide the service.\n- Zoom and Google, when a teacher connects their account, to create meetings.\n- Authorities, when the law requires it.",
      },
      roles: {
        title: "The role of centers",
        body: "Student and guardian data is added by the center or teacher, who is responsible for obtaining their consent. We process this data on the center's behalf, only to provide the service to it.",
      },
      retention: {
        title: "How long we keep data",
        body: "- We keep data for as long as the account is in use or the center's subscription is active.\n- Zoom and Google tokens are deleted as soon as the account is disconnected or the app is removed.\n- When you ask us to delete your account or your center's data, we delete it within 30 days, except where the law requires us to keep it.\n- Encrypted backups may persist for a short time after deletion and are then removed automatically.",
      },
      security: {
        title: "How we protect data",
        body: "- All connections to the platform are encrypted with HTTPS.\n- Passwords are stored as one-way hashes, and connected-service tokens are encrypted in the database.\n- Each center's data is isolated from every other center, and access is limited by each user's role.\n- File links are signed and expire after a short time.",
      },
      rights: {
        title: "Your rights",
        body: "Under Egypt's Personal Data Protection Law No. 151 of 2020 and similar laws, you have the right to:\n\n- Know what data we hold about you and get a copy of it.\n- Correct inaccurate data.\n- Ask us to delete your data.\n- Object to or restrict the processing of your data.\n- Withdraw your consent at any time, for example by disconnecting Zoom in your settings.\n\nTo exercise any of these rights, email {email} from the address registered on your account, and we will respond within 30 days. If you are a student at a center, you can also contact the center's administration. You also have the right to lodge a complaint with Egypt's Personal Data Protection Center.",
      },
      children: {
        title: "Children",
        body: "The platform is meant for teachers and learning centers. Accounts for students under 16 are created by the center, which is responsible for obtaining a parent's or guardian's consent. Only teachers connect the Zoom app; students join meetings through a link without connecting any account.",
      },
      cookies: {
        title: "Cookies",
        body: "We use only essential cookies and storage: to keep you signed in and to remember your language and theme. We do not use tracking or advertising cookies.",
      },
      changes: {
        title: "Changes to this policy",
        body: "We may update this policy and will show the new date at the top of this page. If a change is significant, we will tell users in the platform or by email before it takes effect.",
      },
    },
  },
  terms: {
    title: "Terms of use",
    description: "The terms that govern use of the platform.",
    intro:
      "These terms govern your use of the platform operated by {owner}. By using the platform or creating an account, you agree to these terms and to the privacy policy.",
    sections: {
      service: {
        title: "The service",
        body: "A platform for managing students, courses, live sessions, exams, reports and a file library, for teachers, learning centers and their students.",
      },
      accounts: {
        title: "Accounts",
        body: "- You agree to provide accurate information and to keep your password confidential.\n- You are responsible for everything done through your account.\n- Tell us right away if you suspect unauthorized access to your account.",
      },
      centers: {
        title: "Responsibilities of centers and teachers",
        body: "- Add student and guardian data lawfully and with their consent, including a guardian's consent for anyone under 16.\n- Do not upload content that infringes others' rights or breaks the law.\n- Stay within the limits of your subscribed plan.",
      },
      use: {
        title: "Acceptable use",
        body: "You may not use the platform for:\n\n- Any illegal or fraudulent activity.\n- Attempting to access another center's data or another user's account.\n- Disrupting or overloading the platform, or probing it for vulnerabilities without written permission.\n- Sending spam or abusive content.",
      },
      thirdParty: {
        title: "Third-party services",
        body: "Connecting Zoom and Google is optional and is also subject to those services' terms. Meetings are created on the teacher's own account and licence, and their Zoom plan's limits apply. The platform is not affiliated with Zoom or Google.",
      },
      billing: {
        title: "Plans and payment",
        body: "Some features depend on the center's plan. A free trial may be available. We notify centers of any price change before it takes effect.",
      },
      content: {
        title: "Content ownership",
        body: "Content you upload or write remains yours or your center's. You grant us permission to host and process it only as needed to provide the service. The platform itself, including its design and software, belongs to {owner}.",
      },
      availability: {
        title: "Availability",
        body: "We work to keep the platform available and stable, but it is provided as is, without a guarantee that it will be uninterrupted or error-free. We may pause it temporarily for maintenance.",
      },
      liability: {
        title: "Limitation of liability",
        body: "To the extent the law allows, we are not liable for indirect damages or lost profits arising from use of, or inability to use, the platform, or for outages of third-party services such as Zoom.",
      },
      termination: {
        title: "Suspension and termination",
        body: "You can stop using the platform and ask us to delete your account at any time. We may suspend any account that breaches these terms, and will notify its owner where possible.",
      },
      changes: {
        title: "Changes",
        body: "We may change these terms and will show the new date at the top of this page. Continuing to use the platform after a change means you accept it.",
      },
      law: {
        title: "Governing law",
        body: "These terms are governed by the laws of the Arab Republic of Egypt, and Egyptian courts have jurisdiction over any dispute arising from them.",
      },
    },
  },
  support: {
    title: "Support",
    description: "How to get help using the platform.",
    intro: "We're here to help. Email us and we'll reply within two business days.",
    email: "Support email",
    include: {
      title: "To help us help you quickly",
      body: "- Your center's name and the email registered on your account.\n- What you were trying to do, and what happened instead.\n- A screenshot or the text of any error message.",
    },
    guides: {
      title: "Helpful guides",
      zoom: "Connecting, using and removing Zoom",
      privacy: "Privacy policy and your data rights",
    },
    faq: {
      title: "Frequently asked questions",
      zoomError: {
        q: "Zoom shows an error when I connect",
        a: "If your Zoom account belongs to an organization, its Zoom admin may block third-party apps. Ask them to approve the app, then try again from your settings.",
      },
      reconnect: {
        q: "The platform asks me to reconnect Zoom",
        a: "This happens if you removed the app from your Zoom account or the connection expired. Click Connect Zoom account in your settings again.",
      },
      deleteData: {
        q: "How do I delete my account or my center's data?",
        a: "Email us from the address registered on your account, and we'll complete the request within 30 days.",
      },
    },
  },
  zoomGuide: {
    title: "Zoom guide",
    description: "How a teacher connects their Zoom account to the platform, uses it, and removes it.",
    intro:
      "Connecting Zoom lets the platform create the meetings for a teacher's sessions automatically on their own account. Students join straight from the session page, and their attendance is recorded automatically.",
    sections: {
      requirements: {
        title: "Requirements",
        body: "- A teacher or center admin account on the platform.\n- A Zoom account, free or paid. Your Zoom plan's limits, such as meeting length, apply to session meetings.\n- If your Zoom account belongs to an organization, its Zoom admin may need to approve the app.",
      },
      add: {
        title: "Connecting your Zoom account",
        body: "1. Sign in to the platform.\n2. Open Settings from the sidebar, then go to the Meeting accounts section.\n3. Click Connect Zoom account.\n4. Sign in to Zoom if asked, review the requested permissions, then click Allow.\n5. You return to Settings, and the account shows as Connected.",
      },
      permissions: {
        title: "Permissions the app requests",
        body: "- Read your basic account details (ID and email) to show which account is connected.\n- Create, update, delete and read meetings, only for the sessions you schedule on the platform.\n- Know when participants join a meeting, to record student attendance.",
      },
      use: {
        title: "Using it",
        body: "- When you create a session, choose Zoom as its platform. The meeting is created on your account and its link reaches your students.\n- Changing the session's time updates the meeting, and cancelling the session deletes it.\n- At session time, start the meeting. Students join with the Join session button.\n- The session shows as live when the meeting starts, and as over when it ends.\n- A student's attendance is recorded automatically when they join signed in to Zoom with the same email as on the platform.\n- During a one-to-one session you can start a call with the student from the chat.",
      },
      remove: {
        title: "Removing the connection",
        body: "From the platform:\n\n1. Open Settings, then the Meeting accounts section.\n2. Click Disconnect next to Zoom.\n\nOr from Zoom:\n\n1. Sign in to the Zoom App Marketplace.\n2. Open Manage, then Added Apps.\n3. Click Remove next to the app.\n\nEither way, we delete your Zoom tokens and account details from the platform immediately. Meetings created earlier stay on your Zoom account, and upcoming sessions need you to reconnect or use a manual link.",
      },
      data: {
        title: "Your data",
        body: "We do not access your recordings, your chats, or any meetings not created by the platform. See the privacy policy for full details.",
      },
      troubleshooting: {
        title: "Troubleshooting",
        body: "- Zoom shows an error when connecting: make sure your organization's Zoom admin allows the app, then try again.\n- Couldn't connect your Zoom account: try again from Settings, and contact support if it keeps happening.\n- The platform asks you to reconnect: click Connect Zoom account again.\n- A student's attendance wasn't recorded: check that they joined signed in to Zoom with the same email as on the platform. You can also record attendance manually.",
      },
    },
  },
};

export default legal;
