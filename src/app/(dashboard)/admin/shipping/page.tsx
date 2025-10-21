import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Shipping Configuration | Admin',
  description: 'Manage shipping weight calculation settings',
};

export default function ShippingConfigurationPage() {
  // Redirect to the settings page with the shipping tab
  redirect('/admin/settings?tab=shipping');
}
