import classNames from 'classnames';
import { useRecoilValue } from 'recoil';
import {
  Container,
  Divider,
  Header,
  Icon,
  Image,
  Segment,
} from 'semantic-ui-react';

import { DataContext } from '../../client/context';
import { useImage, useSetupDataState } from '../../client/hooks/item';
import { ItemType } from '../../misc/enums';
import t from '../../misc/lang';
import { FieldPath, ServerCollection } from '../../misc/types';
import { AppState } from '../../state';
import {
  CategoryLabel,
  DateAddedLabel,
  DatePublishedLabel,
  FavoriteLabel,
  LastUpdatedLabel,
  NameTable,
  UrlList,
} from '../dataview/Common';
import { CollectionMenu } from '../item/Collection';
import { LabelField, LabelFields } from './ItemLayout';
import styles from './ItemLayout.module.css';

export type CollectionHeaderData = DeepPick<
  ServerCollection,
  | 'id'
  | 'name'
  | 'profile'
  | 'info'
  | 'pub_date'
  | 'category.name'
  | 'metatags.favorite'
  | 'metatags.read'
  | 'metatags.inbox'
  | 'last_updated'
  | 'timestamp'
>;

export const collectionHeaderDataFields: FieldPath<ServerCollection>[] = [
  'name',
  'info',
  'category.name',
  'urls.name',
  'profile',
  'metatags.*',
  'last_updated',
  'timestamp',
  'pub_date',
];

export function CollectionItemHeader({
  data: initialData,
}: {
  data: CollectionHeaderData;
}) {
  const blur = useRecoilValue(AppState.blur);

  const { data, dataContext } = useSetupDataState({
    initialData,
    itemType: ItemType.Collection,
    key: 'header',
  });

  const { src } = useImage(data?.profile);

  return (
    <DataContext.Provider value={dataContext}>
      <Container>
        <Segment basic className="no-margins no-top-padding no-right-padding">
          <div className={classNames(styles.header_content)}>
            <div className={styles.cover_column}>
              <Image
                centered
                rounded
                className={classNames({ blur })}
                alt="cover image"
                id={styles.cover}
                src={src}
                width={data?.profile?.size?.[0]}
                height={data?.profile?.size?.[1]}
              />
            </div>
            <Segment className="no-margins no-right-padding" basic>
              <NameTable>
                <FavoriteLabel
                  defaultRating={data?.metatags?.favorite ? 1 : 0}
                  size="gigantic"
                  className="float-left"
                />
                <CollectionMenu
                  trigger={
                    <Icon
                      link
                      size="large"
                      className="float-right"
                      name="ellipsis vertical"
                    />
                  }
                />
              </NameTable>
              <Header textAlign="center">
                <LastUpdatedLabel timestamp={data?.last_updated} />
                <DateAddedLabel timestamp={data?.timestamp} />
              </Header>
              <Divider hidden className="small" />
              <LabelFields>
                <LabelField label={t`Category`}>
                  <CategoryLabel />
                </LabelField>

                <LabelField label={t`Published`}>
                  <DatePublishedLabel />
                </LabelField>
                <LabelField label={t`External links`} padded={false}>
                  <UrlList />
                </LabelField>
              </LabelFields>
            </Segment>
          </div>
        </Segment>
      </Container>
    </DataContext.Provider>
  );
}
