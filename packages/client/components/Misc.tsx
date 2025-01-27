import '@brainhubeu/react-carousel/lib/style.css';
import 'swiper/swiper-bundle.css';

import classNames from 'classnames';
import maxSize from 'popper-max-size-modifier';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Editor from 'react-simple-code-editor';
import { useWindowScroll } from 'react-use';
import {
  Button,
  Divider,
  Header,
  Icon,
  Label,
  List,
  Message,
  Popup,
  Segment,
} from 'semantic-ui-react';
import SwiperCore, { Autoplay, Navigation } from 'swiper/core';
import { Swiper, SwiperSlide } from 'swiper/react';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useCommand } from '../client/command';
import { QueryType, useQueryType } from '../client/queries';
import { ItemType, LogType } from '../misc/enums';
import t from '../misc/lang';
import { ServerGallery, ServerItem } from '../misc/types';
import { parseMarkdown, scrollToTop } from '../misc/utility';
import { MiscState } from '../state';
import { useInitialRecoilState } from '../state/index';
import GalleryCard, { galleryCardDataFields } from './item/Gallery';
import styles from './Misc.module.css';

SwiperCore.use([Navigation, Autoplay]);

export function SortableItemItem<T extends { id: string }>({
  item,
  children,
  as: El = List.Item,
  ...props
}: {
  item: T;
  children?: React.ReactNode;
  as?: React.ElementType;
} & { [key: string]: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  delete attributes.role;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <El
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      item={item}
      {...props}>
      {children}
    </El>
  );
}

class DragItemPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (event) => {
        if (!event.nativeEvent.target?.dataset?.dragItem) {
          return false;
        }

        return true;
      },
    },
  ];
}

export function SortableList<T extends { id: string }, P extends { item: T }>({
  element: Element,
  direction = 'vertical',
  items,
  onlyOnDragItem,
  onItemsChange,
}: {
  element: React.ComponentType<P>;
  items: T[];
  direction?: 'vertical' | 'horizontal';
  onlyOnDragItem?: boolean;
  onItemsChange: (items: T[]) => void;
}) {
  const sensors = useSensors(
    useSensor(onlyOnDragItem ? DragItemPointerSensor : PointerSensor)
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;

      if (active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const r = arrayMove(items, oldIndex, newIndex);
        onItemsChange?.(r);
      }
    },
    [onItemsChange]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}>
      <SortableContext
        items={items}
        strategy={
          direction === 'vertical'
            ? verticalListSortingStrategy
            : horizontalListSortingStrategy
        }>
        {items.map((i) => (
          <Element key={i.id} item={i} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function ServerLog({
  type,
  ...props
}: React.ComponentProps<typeof Segment> & { type: LogType }) {
  const { data, isLoading } = useQueryType(
    QueryType.LOG,
    { log_type: type },
    { refetchInterval: 2000, keepPreviousData: true }
  );

  return (
    <Segment
      className="max-300-h overflow-auto"
      loading={isLoading}
      secondary
      {...props}>
      <pre>{data?.data?.log}</pre>
    </Segment>
  );
}

export function TextEditor({
  onChange,
  value,
  ...props
}: {
  value?: string;
  onChange?: (value: string) => void;
} & Omit<
  React.ComponentProps<typeof Editor>,
  'ref' | 'onValueChange' | 'onChange' | 'highlight' | 'value'
>) {
  return (
    <Editor
      value={value}
      onValueChange={onChange}
      highlight={(s) => s}
      padding={10}
      style={{
        border: '1px solid rgba(34, 36, 38, 0.15)',
        background: 'rgba(0, 0, 0, 0.05) none repeat scroll 0% 0%',
        minHeight: '8em',
      }}
      placeholder="</ Text here ...>"
      {...props}
    />
  );
}

export function JSONTextEditor({
  value,
  defaultValue,
  onChange: initialOnChange,
}: {
  value?: object;
  defaultValue?: object;
  onChange?: (value: object) => void;
} & Omit<
  React.ComponentProps<typeof TextEditor>,
  'value' | 'onChange' | 'defaultValue'
>) {
  const [error, setError] = useState('');
  const [textValue, setTextValue] = useState<string>(
    value ? JSON.stringify(value) : undefined
  );

  const onChange = useCallback(
    (v: string) => {
      try {
        const o = JSON.parse(v.trim());
        initialOnChange?.(o);
        setError('');
      } catch (e) {
        setError(e.message);
      }
      if (textValue !== undefined) {
        setTextValue(v);
      }
    },
    [initialOnChange]
  );

  return (
    <div>
      <TextEditor
        value={textValue}
        defaultValue={defaultValue ? JSON.stringify(defaultValue) : undefined}
        onChange={onChange}
      />
      {!!error && (
        <Message negative>
          <p>{error}</p>
        </Message>
      )}
    </div>
  );
}

export function PageTitle({ title }: { title?: string }) {
  if (!global.app.IS_SERVER) {
    document.title = title
      ? title + ' - ' + global.app.title
      : global.app.title;
  }
  return null;
}

export function Markdown({ children }: { children?: string }) {
  return <div dangerouslySetInnerHTML={{ __html: parseMarkdown(children) }} />;
}

export function ScrollUpButton() {
  const { y } = useWindowScroll();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (y > 300) {
      if (!visible) {
        setVisible(true);
      }
    } else {
      if (visible) {
        setVisible(false);
      }
    }
  }, [y, visible]);

  return (
    <Visible visible={visible}>
      <Button onClick={scrollToTop} icon="chevron up" size="small" basic />
    </Visible>
  );
}

export function Visible({
  children,
  visible,
}: {
  children: React.ReactNode;
  visible?: boolean;
}): JSX.Element {
  return visible ? (children as any) : null;
}

export function TitleSegment({
  title,
  headerSize,
  children,
  as,
}: {
  title: string;
  as?: React.ElementType;
  headerSize?: React.ComponentProps<typeof Header>['size'];
  children?: React.ReactNode;
}) {
  return (
    <>
      <Header size={headerSize}>{title}</Header>
      <Segment as={as}>{children}</Segment>
    </>
  );
}

export function EmptySegment({
  title = t`Nothing to see here...`,
  description,
  children,
}: {
  title?: React.ReactNode;
  children?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <Segment placeholder disabled className="!min-0-h w-full h-full">
      <Header className="center text-center sub-text" icon>
        <Icon className="hpx-standard sub-text" size="huge" />
        {title}
        <Header.Subheader>{description}</Header.Subheader>
      </Header>
      {children}
    </Segment>
  );
}

export function EmptyMessage({
  title = t`Nothing to see here...`,
  description,
  className,
}: {
  title?: string;
  className?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <Message className={className}>
      <Message.Header className="center text-center sub-text">
        {title}
      </Message.Header>
      <Message.Content className="text-center sub-text">
        {description}
        <Segment basic textAlign="center">
          <Icon className="hpx-standard sub-text" size="huge" />
        </Segment>
      </Message.Content>
    </Message>
  );
}

// export function Slider({
//   autoPlay,
//   children,
//   className,
//   ...props
// }: {
//   autoPlay?: boolean;
// } & React.ComponentProps<typeof Segment>) {
//   const items = React.Children.toArray(children);
//   return (
//     <Segment basic {...props} className={classNames('slider', className)}>
//       {!items.length && <EmptySegment />}
//       {items && (
//         <Carousel
//           autoPlay={autoPlay ?? false}
//           showThumbs={false}
//           showStatus={false}
//           centerMode
//           centerSlidePercentage={50}
//           emulateTouch
//           interval={10000}>
//           {children}
//         </Carousel>
//       )}
//     </Segment>
//   );
// }

function SliderNav({
  direction,
  onClick,
  disabled,
}: {
  direction: 'left' | 'right';
  disabled?: boolean;
  onClick?: Function;
}) {
  return (
    <Icon
      disabled={disabled}
      name={classNames('chevron', direction)}
      onClick={onClick}
      circular
      inverted
      link
      className={classNames(`slide-next-${direction}`, 'slide-next')}
    />
  );
}

export const SliderElement = SwiperSlide;

export function Slider({
  show: initialShow,
  defaultShow,
  stateKey,
  infinite,
  children,
  topPadding,
  fluid,
  label,
  showCount = true,
  touchStartPreventDefault = false,
  color,
  autoplay,
  className,
  ...props
}: {
  show?: boolean;
  defaultShow?: boolean;
  stateKey?: string;
  fluid?: boolean;
  loading?: boolean;
  infinite?: boolean;
  topPadding?: boolean;
  showCount?: boolean;
  touchStartPreventDefault?: boolean;
  autoplay?: boolean;
  label?: React.ReactNode;
} & React.ComponentProps<typeof Segment>) {
  const [open, setOpen] = useInitialRecoilState(
    MiscState.labelAccordionOpen(stateKey),
    initialShow ?? defaultShow
  );

  const swiper = useRef<SwiperCore>();

  const items = React.Children.toArray(children);

  useEffect(() => {
    if (swiper.current) {
      swiper.current.update();
    }
  }, [children]);

  const onLabelClick = useCallback(
    (e) => {
      e.preventDefault();
      if (initialShow === undefined) {
        setOpen(!open);
      }
    },
    [open]
  );

  const onSwiper = useCallback((s) => {
    swiper.current = s;
  }, []);

  const onAutoplay = useMemo(
    () =>
      autoplay
        ? {
            delay: 10000,
            pauseOnMouseEnter: true,
            disableOnInteraction: false,
            stopOnLastSlide: false,
          }
        : undefined,
    [autoplay]
  );

  const navigation = useMemo(
    () => ({
      nextEl: '.slide-next-right',
      prevEl: '.slide-next-left',
    }),
    []
  );

  const breakpoints = useMemo(
    () => ({
      460: {
        slidesPerView: 2,
        slidesPerGroup: 2,
      },
      675: {
        slidesPerView: 3,
        slidesPerGroup: 3,
      },
      980: {
        slidesPerView: 4,
        slidesPerGroup: 3,
      },
      1200: {
        slidesPerView: 5,
        slidesPerGroup: 3,
      },
      1800: {
        slidesPerView: 6,
        slidesPerGroup: 3,
      },
    }),
    []
  );

  return (
    <Segment
      basic
      {...props}
      className={classNames('swiper', className, { fluid: fluid })}>
      {!!label && (
        <Label
          color={color}
          attached="top"
          as={initialShow === false ? undefined : 'a'}
          onClick={onLabelClick}>
          <Icon name={open ? 'caret down' : 'caret right'} />
          {label}
          {showCount && <Label.Detail>{items.length}</Label.Detail>}
        </Label>
      )}
      <Visible visible={initialShow || open}>
        {!items.length && <EmptySegment />}
        {items && (
          <Swiper
            onSwiper={onSwiper}
            autoplay={onAutoplay}
            loop={infinite}
            slidesPerView={3}
            watchOverflow
            touchStartPreventDefault={touchStartPreventDefault}
            navigation={navigation}
            breakpoints={breakpoints}>
            {children}
            <SliderNav direction="left" />
            <SliderNav direction="right" />
          </Swiper>
        )}
      </Visible>
    </Segment>
  );
}

export function LabelAccordion({
  stateKey,
  children,
  className,
  basic = true,
  label,
  detail,
  show: initialShow,
  defaultShow,
  color,
  attached = 'top',
  ...props
}: {
  stateKey?: string;
  show?: boolean;
  defaultShow?: boolean;
  attached?: React.ComponentProps<typeof Label>['attached'];
  color?: React.ComponentProps<typeof Label>['color'];
  label?: React.ReactNode;
  detail?: React.ReactNode;
} & React.ComponentProps<typeof Segment>) {
  const [show, setShow] = stateKey
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      useInitialRecoilState(
        MiscState.labelAccordionOpen(stateKey),
        initialShow ?? defaultShow
      )
    : // eslint-disable-next-line react-hooks/rules-of-hooks
      useState(initialShow ?? defaultShow);

  return (
    <Segment
      {...props}
      basic={basic}
      className={classNames('small-padding-segment', className)}>
      <Label
        as="a"
        color={color}
        attached={attached}
        onClick={useCallback(
          (e) => {
            e.preventDefault();
            if (initialShow === undefined) {
              setShow(!show);
            }
          },
          [show]
        )}>
        <Icon name={show ? 'caret down' : 'caret right'} />
        {label}
        {!!detail && <Label.Detail>{detail}</Label.Detail>}
      </Label>
      {show && children}
      {!show && <Divider hidden fitted />}
    </Segment>
  );
}

export function PageInfoMessage({
  props,
  className,
  color,
  hidden,
  size,
  onDismiss,
  children,
}: React.ComponentProps<typeof Message>) {
  return (
    <Message
      hidden={hidden}
      color={color}
      onDismiss={onDismiss}
      size={size}
      className={classNames(styles.pageinfo_message, className)}
      {...props}>
      {children}
    </Message>
  );
}

export function PopupNoOverflow(props: React.ComponentProps<typeof Popup>) {
  const applyMaxSize = useMemo(() => {
    return {
      name: 'applyMaxSize',
      enabled: true,
      phase: 'beforeWrite',
      requires: ['maxSize'],
      fn({ state }) {
        // The `maxSize` modifier provides this data
        const { width, height } = state.modifiersData.maxSize;

        state.styles.popper = {
          ...state.styles.popper,
          maxWidth: `${Math.max(100, width)}px`,
          maxHeight: `${Math.max(100, height)}px`,
        };
      },
    };
  }, []);

  return (
    <Popup
      {...props}
      offset={[20, 0]}
      popperModifiers={[maxSize, applyMaxSize]}
    />
  );
}

export function SimilarItemsSlider({
  type,
  stateKey,
  item,
  ...props
}: {
  type: ItemType;
  stateKey?: string;
  item: DeepPick<ServerItem, 'id'>;
} & React.ComponentProps<typeof Slider>) {
  const [data, setData] = useState<ServerGallery[]>([]);

  const { data: cmd, isLoading } = useQueryType(QueryType.SIMILAR, {
    item_id: item.id,
    item_type: type,
    fields: galleryCardDataFields,
    limit: 50,
  });

  const [loading, setLoading] = useState(isLoading);

  useCommand(cmd?.data, {
    callback: (v) => {
      const d = v[cmd.data];
      if (d) {
        setData(d.items as ServerGallery[]);
      }
      setLoading(false);
    },
  });

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
    }
  }, [isLoading]);

  return (
    <Slider
      autoplay
      loading={loading}
      stateKey={stateKey}
      showCount={false}
      label={t`Just like this one`}
      {...props}>
      {data.map((i) => (
        <SliderElement key={i.id}>
          <GalleryCard size="small" data={i} />
        </SliderElement>
      ))}
    </Slider>
  );
}
