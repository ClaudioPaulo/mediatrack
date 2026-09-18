import { redirect } from 'next/navigation';

// O middleware já garante que utilizadores não autenticados nunca chegam aqui
// sem passar por /login, por isso simplesmente redirecionamos para o dashboard.
export default function RootPage() {
  redirect('/dashboard');
}
