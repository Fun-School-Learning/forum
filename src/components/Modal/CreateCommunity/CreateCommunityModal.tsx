import { auth, firestore } from "@/firebase/clientApp";
import useDirectory from "@/hooks/useDirectory";
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Box,
  Text,
  Input,
  Stack,
  Checkbox,
  Flex,
  Icon,
} from "@chakra-ui/react";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/router";
import React, { ChangeEvent, FC, ReactElement, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { IconType } from "react-icons";
import { BsFillEyeFill, BsFillPersonFill } from "react-icons/bs";
import { HiLockClosed } from "react-icons/hi";

/**
 * Controls whether the modal is open or closed by its state.
 * Handles closing the modal.
 */
type CreateCommunityModalProps = {
  open: boolean;
  handleClose: () => void;
};

/**
 * Modal for creating communities.
 * @param {open, handleClose} - control whether modal is opened or closed
 * @returns (React.FC) - modal component
 */
const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  open,
  handleClose,
}) => {
  const [user] = useAuthState(auth);
  const communityNameLengthLimit = 25; // community names are 25 characters long
  const [communityName, setCommunityName] = useState("");
  const [charRemaining, setCharRemaining] = useState(communityNameLengthLimit);
  const [communityType, setCommunityType] = useState("public");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toggleMenuOpen } = useDirectory();

  /**
   * Handles changes in the input element which takes the name of the community to be created.
   *
   * If the community name entered is above the limit:
   *    - Exists if the community name is too long (above the limit).
   *
   * If the community name entered is within the limit:
   *    - Updates the state of `communityName` which allows the creation of the community with the inputted name
   *    - Updates the number of characters remaining based on the number of characters used so far.
   * @param event
   * @returns
   */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value.length > communityNameLengthLimit) return; // community is not created if the name is above the limit
    // TODO: do not allow spaces
    setCommunityName(event.target.value); // updates the state of `communityName`
    setCharRemaining(communityNameLengthLimit - event.target.value.length); // computing remaining characters for community names
  };

  /**
   * Only 1 checkbox can be toggled as only 1 community type can be created.
   * If a community type checkbox is toggled,
   * toggling another checkbox would untoggle the previous one.
   * @param event (React.ChangeEvent<HTMLInputElement>) - change in HTML input field
   */
  const onCommunityTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCommunityType(event.target.name);
  };

  /**
   * Creates a new community in Firestore with the given community name and privacy type,
   * and adds the current user as the community creator and member.
   *
   * Does not allow creating a community if:
   *    - It contains special characters
   *    - If the the name is too short
   *    - If the name is already taken
   *
   * @async
   * @throws {Error} If the community name contains special characters or is too short, or if the community name is already taken.
   * @returns {void}
   */
  const handleCreateCommunity = async () => {
    if (error) setError("");
    // prevents community from being created if it has special characters
    const format: RegExp = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
    if (format.test(communityName)) {
      setError("Community name can only contain letters and numbers");
      return;
    }
    // prevents community from being created if its too short
    if (communityName.length < 3) {
      setError("Community name must be at least 3 characters long");
      return;
    }

    setLoading(true);

    try {
      // check if community exists by using document reference
      // takes firestore object, name of collection in db, and the id (community names are unique)
      const communityDocRef = doc(firestore, "communities", communityName);
      /**
       * if one transaction fails they all fail
       */
      await runTransaction(firestore, async (transaction) => {
        const communityDoc = await transaction.get(communityDocRef);
        if (communityDoc.exists()) {
          throw new Error(
            `The community ${communityName} is already taken. Try a different name! `
          );
        }

        // create community
        transaction.set(communityDocRef, {
          creatorId: user?.uid,
          createdAt: serverTimestamp(),
          numberOfMembers: 1,
          privacyType: communityType,
        });

        // create community snippet on user
        transaction.set(
          // path: collection/document/collection/...
          doc(firestore, `users/${user?.uid}/communitySnippets`, communityName),
          {
            communityId: communityName,
            isAdmin: true,
          }
        );
      });

      router.push(`community/${communityName}`);
      handleClose();
      toggleMenuOpen();
    } catch (error: any) {
      console.log("Error: handleCreateCommunity", error);
      setError(error.message);
      setLoading(false);
    }
    setLoading(false);
  };

  return (
    <>
      <Modal isOpen={open} onClose={handleClose}>
        <ModalOverlay />
        <ModalContent borderRadius={10}>
          <ModalHeader
            display="flex"
            flexDirection="column"
            // fontSize={15}
            padding={3}
            textAlign="center"
          >
            Create Community
          </ModalHeader>
          <Box pl={3} pr={3}>
            <ModalCloseButton />
            <ModalBody display="flex" flexDirection="column" padding="10px 0px">
              <Text fontWeight={600} fontSize={15}>
                Name
              </Text>
              <Text fontSize={11} color="gray.500">
                Community names cannot be changed
              </Text>
              <Input
                mt={2}
                value={communityName}
                placeholder="Community Name"
                onChange={handleChange}
                fontSize="10pt"
                _placeholder={{ color: "gray.500" }}
                _hover={{
                  bg: "white",
                  border: "1px solid",
                  borderColor: "red.500",
                }}
                _focus={{
                  outline: "none",
                  border: "1px solid",
                  borderColor: "red.500",
                }}
              />
              <Text
                fontSize="9pt"
                mt={1}
                color={charRemaining === 0 ? "red" : "gray.500"}
              >
                {/* Updates the remaining characters in real time
                The colour changes to red if the limit is hit */}
                {charRemaining} Characters remaining
              </Text>
              <Text fontSize="9pt" color="red" pt={1}>
                {error}
              </Text>
              <Box mt={4} mb={4}>
                <Text fontWeight={600} fontSize={15}>
                  Community Type
                </Text>

                {/* Contains community types that can be created
                Only 1 community type can be created hence only 1 box can be checked
                Checking another box (community type)  */}
                <Stack spacing={2}>
                  <CommunityTypeOption
                    name="public"
                    icon={BsFillPersonFill}
                    label="Public"
                    description="Everyone can view and post"
                    isChecked={communityType === "public"}
                    onChange={onCommunityTypeChange}
                  />
                  <CommunityTypeOption
                    name="restricted"
                    icon={BsFillEyeFill}
                    label="Restricted"
                    description="Everyone can view but only subscribers can post"
                    isChecked={communityType === "restricted"}
                    onChange={onCommunityTypeChange}
                  />
                  <CommunityTypeOption
                    name="private"
                    icon={HiLockClosed}
                    label="Private"
                    description="Only subscribers can view and post"
                    isChecked={communityType === "private"}
                    onChange={onCommunityTypeChange}
                  />
                </Stack>
              </Box>
            </ModalBody>
          </Box>

          <ModalFooter bg="gray.100" borderRadius="0px 0px 10px 10px">
            <Button
              variant="outline"
              height="30px"
              mr={3}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              height="30px"
              onClick={handleCreateCommunity}
              isLoading={loading}
            >
              Create Community
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
export default CreateCommunityModal;

type CommunityTypeOptionProps = {
  name: string;
  icon: IconType;
  label: string;
  description: string;
  isChecked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const CommunityTypeOption: FC<CommunityTypeOptionProps> = ({
  name,
  icon,
  label,
  description,
  isChecked,
  onChange,
}) => {
  return (
    <Checkbox
      name={name}
      isChecked={isChecked}
      onChange={onChange}
      colorScheme="red"
    >
      <Flex align="center">
        <Icon as={icon} color="gray.500" mr={2} />
        <Text fontSize="10pt" mr={1}>
          {label}
        </Text>
        <Text fontSize="8pt" color="gray.500" pt={1}>
          {description}
        </Text>
      </Flex>
    </Checkbox>
  );
};
