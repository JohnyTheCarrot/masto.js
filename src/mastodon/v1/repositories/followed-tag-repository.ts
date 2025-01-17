import type { MastoConfig } from '../../../config';
import { version } from '../../../decorators';
import type { Http } from '../../../http';
import type { Logger } from '../../../logger';
import { Paginator } from '../../../paginator';
import type { DefaultPaginationParams, Repository } from '../../repository';
import type { Tag } from '../entities';

export class FollowedTagRepository
  implements Repository<Tag, never, never, never, DefaultPaginationParams>
{
  constructor(
    private readonly http: Http,
    readonly config: MastoConfig,
    readonly logger?: Logger,
  ) {}

  @version({ since: '4.0.0' })
  list(
    params?: DefaultPaginationParams,
  ): Paginator<Tag[], DefaultPaginationParams> {
    return new Paginator(this.http, '/api/v1/followed_tags', params);
  }
}
