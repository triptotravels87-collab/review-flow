import PageHeader from "@/components/admin/PageHeader";
import SettingsForm from "@/components/admin/SettingsForm";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Changes apply to the review page within a minute. Leave a field empty to use the value from your environment variables."
      />
      <SettingsForm />
    </>
  );
}
