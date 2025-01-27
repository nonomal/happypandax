import { handler } from '../../misc/requests';
import { ServiceType } from '../../services/constants';

export default handler().post(async (req, res) => {
  const server = global.app.service.get(ServiceType.Server);

  const { item_type, item_id, viewer_args } = req.body;

  return server
    .open_gallery({
      item_id: item_id as number,
      item_type: item_type as number,
      viewer_args: viewer_args as string,
    })
    .then((r) => {
      res.status(200).json(r);
    });
});
