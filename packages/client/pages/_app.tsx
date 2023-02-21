import '../public/semantic/semantic.css';
import '../style/global.css';
import 'animate.css';
import 'react-virtualized/styles.css';
import 'nprogress/css/nprogress.css';

import axios from 'axios';
import App, { AppContext, AppInitialProps, AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import Router, { useRouter } from 'next/router';
import NProgress from 'nprogress';
import { useEffect, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RecoilRoot, useRecoilState, useSetRecoilState } from 'recoil';

import { QueryClientProvider, useIsFetching } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { queryClient } from '../client/queries';
import { LoginModal } from '../components/Login';
import { IS_SERVER, ServiceType } from '../server/constants';
import { NotificationData, ServerUser } from '../shared/types';
import { AppState } from '../state';
import { useGlobalValue, useSetGlobalState } from '../state/global';

import type { GetServerSession } from '../server/requests';
const Theme = dynamic(() => import('../components/Theme'), { ssr: false });
interface AppPageProps extends AppInitialProps {
  pageProps: {
    notifications: NotificationData[];
    user: ServerUser | null;
    loggedIn: boolean;
    connected: boolean;
    sameMachine: boolean;
    pathname: string;
  };
}

function Fairy() {
  const [notificationAlert, setNotificatioAlert] = useRecoilState(
    AppState.notificationAlert
  );
  const [notifications, setNotifications] = useRecoilState(
    AppState.notifications
  );
  const setConnected = useSetGlobalState('connected');

  const [fairy, setFairy] = useState<EventSource>();

  const notificationAlertRef = useRef(notificationAlert);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    if (!fairy) return;

    const onStatus = ({ data }: any) => {
      const d: any = JSON.parse(data);
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

function AppProgress() {
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

/**
 * Since we make use of recoil selectors, we need to have both recoil and global states, synced
 */
function ItemActivity() {
  const setItemActivityMap = useSetRecoilState(AppState.itemActivityState);
  const activity = useGlobalValue('activity');

  useEffect(() => {
    setItemActivityMap({ ...activity });
  }, [activity]);

  return null;
}

function AppInit() {
  return (
    <>
      <AppProgress />
      <Fairy />
      <ItemActivity />
    </>
  );
}

export function AppRoot({
  children,
  pageProps,
}: {
  children: React.ReactNode;
  pageProps?: AppPageProps['pageProps'];
}) {
  const setConnected = useSetGlobalState('connected');
  const setLoggedIn = useSetGlobalState('loggedIn');
  const setSameMachine = useSetGlobalState('sameMachine');
  const setUser = useSetGlobalState('user');

  useEffect(() => {
    setConnected(pageProps.connected);
    setLoggedIn(pageProps.loggedIn);
    setSameMachine(pageProps.sameMachine);
    setUser(pageProps.user);
  }, [pageProps]);

  return (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <DndProvider backend={HTML5Backend}>
          <AppInit />
          {children}
        </DndProvider>
      </RecoilRoot>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

function MyApp({ Component, pageProps }: AppProps<AppPageProps['pageProps']>) {
  return (
    <AppRoot pageProps={pageProps}>
      {!['/login', '/_error'].includes(pageProps.pathname) && <LoginModal />}
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
  let connected = false;
  let user: ServerUser | null = null;
  let notifications: NotificationData[] = [];
  let pathname = '';

  if (global.app.IS_SERVER) {
    pathname = context.router.pathname;

    sameMachine =
      context.ctx.req.socket.localAddress ===
      context.ctx.req.socket.remoteAddress;

    const service = global.app.service.get(ServiceType.Server);
    connected = service.is_connected();

    const session = await global.app.getServerSession(context.ctx);

    if (session) {
      const fairy = global.app.service.get(ServiceType.Fairy);
      notifications = fairy.get(session.id);

      const server = service.session(session.id);

      if (server) {
        try {
          user = await server.user({}, undefined, { cache: true });
        } catch (e) {
          global.app.log.e('Failed to get user', e);
        }
      }

      if (user) {
        loggedIn = true;
      }
    }

    if (!loggedIn && !['/login', '/_error'].includes(context.router.pathname)) {
      return redirect({
        location: `/login?next=${encodeURIComponent(context.router.asPath)}`,
        ctx: context.ctx,
      }) as any;
    }
  }

  let propsData: AppPageProps['pageProps'] = {
    pathname,
    loggedIn,
    user,
    sameMachine,
    connected,
    notifications,
  };

  if (global.app.IS_SERVER) {
    if (context.ctx.req?.method === 'POST') {
      context.ctx.res?.writeHead(200, {
        'Content-Type': 'application/json',
      });
      context.ctx.res?.end(JSON.stringify(propsData));
      return null;
    }
  } else {
    const res = await axios.post(
      location.origin,
      {},
      {
        withCredentials: true,
      }
    );
    const data: AppPageProps['pageProps'] = res.data;

    propsData = {
      pathname: data.pathname,
      loggedIn: data.loggedIn,
      user: data.user,
      sameMachine: data.sameMachine,
      connected: data.connected,
      notifications: data.notifications,
    };
  }

  const props = await App.getInitialProps(context);

  return {
    ...props,
    pageProps: {
      ...props.pageProps,
      ...propsData,
    },
  };
};

export default MyApp;

if (!global?.app?.initialized && process.env.NODE_ENV !== 'test') {
  if (!IS_SERVER) {
    const { clientInitialize } = await import('../client/initialize');
    await clientInitialize();
  }
}
