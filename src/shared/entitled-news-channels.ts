import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import type { ApiSuccessResponse, NewsFeedChannelDto, NewsFeedChannelListDto } from "@/shared/types/api.types";

export async function fetchEntitledNewsChannels(): Promise<NewsFeedChannelDto[]> {
  const response = await axiosClient.get<ApiSuccessResponse<NewsFeedChannelListDto>>(API_ENDPOINTS.newsFeedChannels);
  return Array.isArray(response.data.data?.items) ? response.data.data.items : [];
}
