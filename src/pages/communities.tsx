import { Community } from "@/atoms/communitiesAtom";
import CommunityItem from "@/components/Community/CommunityItem";
import PersonalHome from "@/components/Community/PersonalHome";
import PageContent from "@/components/Layout/PageContent";
import CommunityLoader from "@/components/Loaders/CommunityLoader";
import { firestore } from "@/firebase/clientApp";
import useCommunityData from "@/hooks/useCommunityData";
import { Box, Button, Stack } from "@chakra-ui/react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const Communities: React.FC = () => {
  const { communityStateValue, onJoinOrLeaveCommunity } = useCommunityData();
  const [loading, setLoading] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const router = useRouter();

  /**
   * Gets the top 10 communities with the most members.
   */
  const getCommunities = async (numberOfExtraPosts: number) => {
    setLoading(true);
    try {
      const communityQuery = query(
        collection(firestore, "communities"),
        orderBy("numberOfMembers", "desc"),
        limit(5 + numberOfExtraPosts)
      );
      const communityDocs = await getDocs(communityQuery);
      const communities = communityDocs.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCommunities(communities as Community[]);
    } catch (error) {
      console.log("Error: getCommunityRecommendations", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCommunities(0);
  }, []);

  return (
    <>
      <PageContent>
        <>
          <Stack direction="column" borderRadius={10}>
            {loading ? (
              <Stack mt={2} p={3}>
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <CommunityLoader key={index} />
                  ))}
              </Stack>
            ) : (
              <>
                {communities.map((community, index) => {
                  const isJoined = !!communityStateValue.mySnippets.find(
                    (snippet) => snippet.communityId === community.id
                  );
                  return (
                    <CommunityItem
                      key={index}
                      community={community}
                      isJoined={isJoined}
                      onJoinOrLeaveCommunity={onJoinOrLeaveCommunity}
                    />
                  );
                })}
              </>
            )}
            <Box p="10px 20px" alignContent="center">
              <Button
                height="34px"
                width="200px"
                onClick={() => {
                  getCommunities(5);
                }}
              >
                View More
              </Button>
            </Box>
          </Stack>
        </>
        <Stack spacing={2}>
          <PersonalHome />
        </Stack>
        <></>
      </PageContent>
    </>
  );
};
export default Communities;
