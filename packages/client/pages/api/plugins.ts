import { ServiceType } from '../../server/constants';
import { handler, RequestOptions } from '../../server/requests';
import { urlparse } from '../../shared/utility';

export default handler().get(async (req, res) => {
  const server = await global.app.service
    .get(ServiceType.Server)
    .context({ req, res });

  const { state, __options } = urlparse(req.url).query;

  return server
    .list_plugins(
      {
        state: state as number,
      },
      undefined,
      __options as RequestOptions
    )
    .then((r) => {
      res.status(200).json(r);
    });
});
