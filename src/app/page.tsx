import AccountGate from "@/components/account/AccountGate";
import InstallWizard from "@/components/pwa/InstallWizard";

export default function HomePage() {
  return (
    <>
      <AccountGate />
      <InstallWizard />
    </>
  );
}
