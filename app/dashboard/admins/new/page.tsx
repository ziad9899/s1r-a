import { NewAdminForm } from "./new-admin-form";

export default function NewAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إضافة مسؤول جديد</h1>
        <p className="text-sm text-muted-foreground">
          أنشئ حساباً جديداً واختر مستوى صلاحياته. سيستطيع تسجيل الدخول
          فوراً بالبريد وكلمة المرور المُحدّدين.
        </p>
      </div>
      <NewAdminForm />
    </div>
  );
}
