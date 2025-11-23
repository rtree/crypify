import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to static shop homepage
  redirect('/shop/index.html');
}
