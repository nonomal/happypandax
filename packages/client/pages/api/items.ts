import { handler } from '../../misc/requests';
import { urlparse } from '../../misc/utility';
import { ServiceType } from '../../services/constants';

export default handler().get(async (req, res) => {
  const server = global.app.service.get(ServiceType.Server);

  const { item_type, metatags, limit, offset, fields } = urlparse(
    req.url
  ).query;

  return server
    .items({
      item_type: item_type as number,
      fields: fields as any,
      metatags: metatags as any,
      limit: limit as number,
      offset: offset as number,
    })
    .then((r) => {
      res.status(200).json(r);
    });
});
