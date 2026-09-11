import {
  createSocialChannelsCollection,
  createSocialPostsCollection,
  type SocialChannelsCollection,
  type SocialPostsCollection,
} from "@spark/data";
let channels: SocialChannelsCollection | undefined;
let posts: SocialPostsCollection | undefined;
export function getSocialChannelsCollection(): SocialChannelsCollection {
  channels ??= createSocialChannelsCollection();
  return channels;
}
export function getSocialPostsCollection(): SocialPostsCollection {
  posts ??= createSocialPostsCollection();
  return posts;
}
