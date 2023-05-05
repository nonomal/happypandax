import AddPage from '../';
import t from '../../../client/lang';
import { PageTitle } from '../../../components/misc/index';
import { Header } from './';

export default function Page() {
  return (
    <AddPage>
      <PageTitle title={t`Add series`} />
      <Header active="series" />
    </AddPage>
  );
}
