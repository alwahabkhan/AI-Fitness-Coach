import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { NotificationContainer } from '@/components/notifications/notification-container';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <NotificationContainer />
    </>
  );
}
