import classNames from 'classnames';
import Link from 'next/link';
import { Card, Icon, Label, Segment } from 'semantic-ui-react';

import t from '../../misc/lang';
import { FieldPath, ServerArtist, ServerCircle } from '../../misc/types';
import { urlstring } from '../../misc/utility';

export type CircleCardLabelData = DeepPick<ServerCircle, 'id' | 'name'>;

export const circleCardLabelDataFields: FieldPath<ServerCircle>[] = [
  'name',
  'artists.preferred_name.name',
];

export default function CircleCardLabel({
  data,
  ...props
}: {
  data: CircleCardLabelData;
} & React.ComponentProps<typeof Card>) {
  return (
    <Card
      {...props}
      as={Segment}
      size="tiny"
      color="teal"
      className={classNames('default-card', props.className)}>
      <Card.Content>
        <Card.Header>
          <Icon name="group" className="sub-text" />
          {data?.name}
          <Label size="mini" className="right">
            {t`ID`}
            <Label.Detail>{data.id}</Label.Detail>
          </Label>
        </Card.Header>
        <Card.Meta>
          <Link
            href={urlstring('/library', {
              q: `circle:"${data.name}"`,
            })}
            passHref>
            <Label
              size="small"
              empty
              className="right"
              icon="grid layout"
              title={t`Show galleries`}
              as="a"
            />
          </Link>
          <Label.Group size="small">
            {data?.artists.map?.((a: ServerArtist) => (
              <Label color="blue" key={a?.id}>
                <Icon name="user" /> {a.preferred_name?.name}
              </Label>
            ))}
          </Label.Group>
        </Card.Meta>
      </Card.Content>
    </Card>
  );
}
