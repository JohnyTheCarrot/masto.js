import { Mention } from './mention';
import { Tag } from './tag';
import { Emoji } from './emoji';
import { Reaction } from './reaction';

export interface Announcement {
  id: string;
  content: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  mentions: Mention[];
  tags: Tag[];
  emojis: Emoji[];
  reactions: Reaction[];
}
