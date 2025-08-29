import UserForm from './UserForm';

export const metadata = {
  title: 'Add New User',
  description: 'Add a new user to the system',
};

export default async function NewUserPage() {
  return <UserForm />;
}
