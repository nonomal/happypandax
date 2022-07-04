import React from 'react';
import { Button, Label, Segment } from 'semantic-ui-react';

import t from '../../misc/lang';
import { SourceItem } from '../../misc/types';
import { LabelAccordion } from '../misc/index';

export function NewGallery({
  source,
  defaultOpen,
  onClose,
  ...props
}: {
  source?: SourceItem;
  defaultOpen?: boolean;
  onClose?: () => void;
} & React.ComponentProps<typeof Segment>) {
  let name = '';

  if (source) {
    name = source.path || source?.file.name;
  }

  return (
    <Segment {...props} clearing>
      {source && (
        <>
          {source.source === 'host' && (
            <Button title={t`Reload path`} icon="refresh" size="mini" />
          )}
          <Label>
            {t`Source:`}
            <Label.Detail>{name}</Label.Detail>{' '}
          </Label>
        </>
      )}

      {onClose && (
        <Button
          floated="right"
          icon="close"
          size="mini"
          basic
          onClick={(e) => {
            e.preventDefault();
            onClose();
          }}
        />
      )}
      <Label className="right" basic color="orange">{t`Already exists`}</Label>
      <LabelAccordion defaultShow={defaultOpen} label={t`Details`}>
        <Segment basic>gdfg</Segment>
      </LabelAccordion>
      <Button color="green" size="tiny" floated="right">{t`Add`}</Button>
    </Segment>
  );
}
