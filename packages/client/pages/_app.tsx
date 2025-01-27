import '../public/semantic/semantic.css';
import '../style/global.css';
import 'animate.css';
import 'react-virtualized/styles.css';
import 'nprogress/css/nprogress.css';

import App, { AppContext, AppInitialProps, AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import Router, { useRouter } from 'next/router';
import NProgress from 'nprogress';
import { useEffect, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { QueryClientProvider, useIsFetching } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { RecoilRoot, useRecoilState, useSetRecoilState } from 'recoil';

import { queryClient } from '../client/queries';
import { LoginModal } from '../components/Login';
import { getSession } from '../misc/requests';
import { NotificationData } from '../misc/types';
import { ServiceType } from '../services/constants';
import { AppState } from '../state';

const Theme = dynamic(() => import('../components/Theme'), { ssr: false });
interface AppPageProps extends AppInitialProps {
  pageProps: {
    notifications: NotificationData[];
    loggedIn: boolean;
    sameMachine: boolean;
  };
}

function Fairy() {
  const [notificationAlert, setNotificatioAlert] = useRecoilState(
    AppState.notificationAlert
  );
  const [notifications, setNotifications] = useRecoilState(
    AppState.notifications
  );
  const setLoggedIn = useSetRecoilState(AppState.loggedIn);
  const setConnected = useSetRecoilState(AppState.connected);

  const [fairy, setFairy] = useState<EventSource>();

  const notificationAlertRef = useRef(notificationAlert);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    if (!fairy) return;

    const onStatus = ({ data }: any) => {
      const d: any = JSON.parse(data);
      setLoggedIn(d.loggedIn);
      setConnected(d.connected);
    };
    fairy.addEventListener('status', onStatus);

    return () => {
      fairy.removeEventListener('status', onStatus);
    };
  }, [fairy]);

  useEffect(() => {
    if (!fairy) return;
    const onNotif = ({ data }: any) => {
      const d: NotificationData = JSON.parse(data);
      if (d.date) {
        d.date = new Date(d.date);
      }
      console.debug('received notification', d);
      setNotificatioAlert([d, ...notificationAlertRef.current]);
      setNotifications([d, ...notificationsRef.current]);
    };

    fairy.addEventListener('notification', onNotif);

    return () => {
      fairy.removeEventListener('notification', onNotif);
    };
  }, [fairy]);

  useEffect(() => {
    setFairy(new EventSource('/api/server/fairy'));
  }, []);

  useEffect(() => {
    notificationAlertRef.current = notificationAlert;
  }, [notificationAlert]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  return null;
}

function Progress() {
  const router = useRouter();
  const isFetching = useIsFetching({
    predicate: (q) => {
      // TODO: filter out status ping query
      return true;
    },
  });
  const [started, setStarted] = useState(false);

  useEffect(() => {
    NProgress.configure({ showSpinner: false });

    router.events.on('routeChangeStart', () => {
      NProgress.start();
    });

    router.events.on('routeChangeComplete', () => {
      NProgress.done();
    });
  }, []);

  useEffect(() => {
    if (isFetching) {
      if (!started) {
        NProgress.start();
        setStarted(true);
      }
    } else {
      NProgress.done();
      setStarted(false);
    }
  }),
    [isFetching];

  return null;
}

export function AppRoot({
  children,
  pageProps,
}: {
  children: React.ReactNode;
  pageProps?: AppPageProps['pageProps'];
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot
        initializeState={(snapshot) => {
          if (pageProps.loggedIn) {
            snapshot.set(AppState.loggedIn, pageProps.loggedIn);
            snapshot.set(AppState.sameMachine, pageProps.sameMachine);
          }
        }}>
        <DndProvider backend={HTML5Backend}>
          <Progress />
          <Fairy />
          {children}
        </DndProvider>
      </RecoilRoot>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

function MyApp({ Component, pageProps }: AppProps<AppPageProps['pageProps']>) {
  const router = useRouter();

  return (
    <AppRoot pageProps={pageProps}>
      {!['/login', '/_error'].includes(router.pathname) && <LoginModal />}
      <Theme>
        <Component {...pageProps} />
      </Theme>
    </AppRoot>
  );
}

function redirect(params: {
  ctx: AppContext['ctx'];
  location: string;
  status?: number;
}) {
  const { ctx, location, status = 307 } = params;

  if (ctx.res) {
    ctx.res.writeHead(status, {
      Location: location,
      // Add the content-type for SEO considerations
      'Content-Type': 'text/html; charset=utf-8',
    });
    ctx.res.end();
    return;
  }

  Router.replace(location, undefined);
}

MyApp.getInitialProps = async function (
  context: AppContext
): Promise<AppPageProps> {
  let loggedIn = false;
  let sameMachine = false;
  if (global.app.IS_SERVER) {
    sameMachine =
      context.ctx.req.socket.localAddress ===
      context.ctx.req.socket.remoteAddress;
    const server = global.app.service.get(ServiceType.Server);
    loggedIn = server.logged_in;

    if (!loggedIn && !['/login', '/_error'].includes(context.router.pathname)) {
      return redirect({
        location: `/login?next=${encodeURIComponent(context.router.asPath)}`,
        ctx: context.ctx,
      }) as any;
    }
  }

  const props = await App.getInitialProps(context);

  const session = await getSession(context.ctx.req, context.ctx.res);
  const fairy = global.app.service.get(ServiceType.Fairy);

  return {
    ...props,
    pageProps: {
      ...props.pageProps,
      loggedIn,
      sameMachine,
      notifications: fairy.get(session.id),
    },
  };
};

export default MyApp;

const IS_SERVER = typeof window === 'undefined';

if (!global?.app?.initialized && process.env.NODE_ENV !== 'test') {
  if (!IS_SERVER) {
    const { clientInitialize } = await import('../misc/initialize/client');
    await clientInitialize();
  }
}
