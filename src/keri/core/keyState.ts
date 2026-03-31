import { components } from '../../types/keria-api-schema.ts';

export type KeyState = components['schemas']['KeyStateRecord'];

export type EstablishmentState = components['schemas']['StateEERecord'];

/**
 * Marker interface for state configuring an IdentifierManager.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IdentifierManagerState {}

/**
 * Defining configuration parameters for a specified, deterministic salt of an IdentifierManager.
 */
export type SaltyKeyState = components['schemas']['SaltyState'];

/**
 * Defining configuration parameters for a random seed identifier manager.
 */
export type RandyKeyState = components['schemas']['RandyKeyState'];

/**
 * Defining properties a multi-signature group identifier manager.
 */
export type GroupKeyState = components['schemas']['GroupKeyState'];

/**
 * Defining properties for an external module identifier manager that uses externally managed keys such as in an HSM or a KMS system.
 */
export type ExternState = components['schemas']['ExternState'];

/**
 * Defining properties of an identifier habitat, know as a Hab in KERIpy.
 */
export type HabState = components['schemas']['HabState'];

export type Icp =
    | components['schemas']['ICP_V_1']
    | components['schemas']['ICP_V_2'];
export type Ixn =
    | components['schemas']['IXN_V_1']
    | components['schemas']['IXN_V_2'];
export type ExnV1 = components['schemas']['EXN_V_1'];
export type Dip =
    | components['schemas']['DIP_V_1']
    | components['schemas']['DIP_V_2'];
export type Rot =
    | components['schemas']['ROT_V_1']
    | components['schemas']['ROT_V_2'];
export type ExnEmbeds = components['schemas']['ExnEmbeds'];
export type MultisigRpyEmbeds = components['schemas']['MultisigRpyEmbeds'];

/**
 * Defining Operation types
 */
export type OOBIOperation = components['schemas']['OOBIOperation'];
export type QueryOperation = components['schemas']['QueryOperation'];
export type EndRoleOperation = components['schemas']['EndRoleOperation'];
export type WitnessOperation = components['schemas']['WitnessOperation'];
export type DelegationOperation = components['schemas']['DelegationOperation'];
export type RegistryOperation = components['schemas']['RegistryOperation'];
export type LocSchemeOperation = components['schemas']['LocSchemeOperation'];
export type ChallengeOperation = components['schemas']['ChallengeOperation'];
export type ExchangeOperation = components['schemas']['ExchangeOperation'];
export type SubmitOperation = components['schemas']['SubmitOperation'];
export type DoneOperation = components['schemas']['DoneOperation'];
export type CredentialOperation = components['schemas']['CredentialOperation'];
export type GroupOperation = components['schemas']['GroupOperation'];
export type DelegatorOperation = components['schemas']['DelegatorOperation'];

export type PendingOOBIOperation =
    components['schemas']['PendingOOBIOperation'];
export type PendingQueryOperation =
    components['schemas']['PendingQueryOperation'];
export type PendingEndRoleOperation =
    components['schemas']['PendingEndRoleOperation'];
export type PendingWitnessOperation =
    components['schemas']['PendingWitnessOperation'];
export type PendingDelegationOperation =
    components['schemas']['PendingDelegationOperation'];
export type PendingRegistryOperation =
    components['schemas']['PendingRegistryOperation'];
export type PendingLocSchemeOperation =
    components['schemas']['PendingLocSchemeOperation'];
export type PendingChallengeOperation =
    components['schemas']['PendingChallengeOperation'];
export type PendingExchangeOperation =
    components['schemas']['PendingExchangeOperation'];
export type PendingSubmitOperation =
    components['schemas']['PendingSubmitOperation'];
export type PendingDoneOperation =
    components['schemas']['PendingDoneOperation'];
export type PendingCredentialOperation =
    components['schemas']['PendingCredentialOperation'];
export type PendingGroupOperation =
    components['schemas']['PendingGroupOperation'];
export type PendingDelegatorOperation =
    components['schemas']['PendingDelegatorOperation'];

export type PendingOperation =
    | PendingOOBIOperation
    | PendingQueryOperation
    | PendingEndRoleOperation
    | PendingWitnessOperation
    | PendingDelegationOperation
    | PendingRegistryOperation
    | PendingLocSchemeOperation
    | PendingChallengeOperation
    | PendingExchangeOperation
    | PendingSubmitOperation
    | PendingDoneOperation
    | PendingCredentialOperation
    | PendingGroupOperation
    | PendingDelegatorOperation;

export type CompletedWitnessOperation =
    components['schemas']['CompletedWitnessOperation'];
export type CompletedEndRoleOperation =
    components['schemas']['CompletedEndRoleOperation'];
export type CompletedOOBIOperation =
    components['schemas']['CompletedOOBIOperation'];
export type CompletedDelegationOperation =
    components['schemas']['CompletedDelegationOperation'];
export type CompletedRegistryOperation =
    components['schemas']['CompletedRegistryOperation'];
export type CompletedLocSchemeOperation =
    components['schemas']['CompletedLocSchemeOperation'];
export type CompletedChallengeOperation =
    components['schemas']['CompletedChallengeOperation'];
export type CompletedExchangeOperation =
    components['schemas']['CompletedExchangeOperation'];
export type CompletedSubmitOperation =
    components['schemas']['CompletedSubmitOperation'];
export type CompletedDoneOperation =
    components['schemas']['CompletedDoneOperation'];
export type CompletedCredentialOperation =
    components['schemas']['CompletedCredentialOperation'];
export type CompletedGroupOperation =
    components['schemas']['CompletedGroupOperation'];
export type CompletedDelegatorOperation =
    components['schemas']['CompletedDelegatorOperation'];
export type CompletedQueryOperation =
    components['schemas']['CompletedQueryOperation'];

export type CompletedOperation =
    | CompletedOOBIOperation
    | CompletedEndRoleOperation
    | CompletedWitnessOperation
    | CompletedDelegationOperation
    | CompletedRegistryOperation
    | CompletedLocSchemeOperation
    | CompletedChallengeOperation
    | CompletedExchangeOperation
    | CompletedSubmitOperation
    | CompletedDoneOperation
    | CompletedCredentialOperation
    | CompletedGroupOperation
    | CompletedDelegatorOperation
    | CompletedQueryOperation;

export type FailedOOBIOperation = components['schemas']['FailedOOBIOperation'];
export type FailedQueryOperation =
    components['schemas']['FailedQueryOperation'];
export type FailedEndRoleOperation =
    components['schemas']['FailedEndRoleOperation'];
export type FailedWitnessOperation =
    components['schemas']['FailedWitnessOperation'];
export type FailedDelegationOperation =
    components['schemas']['FailedDelegationOperation'];
export type FailedRegistryOperation =
    components['schemas']['FailedRegistryOperation'];
export type FailedLocSchemeOperation =
    components['schemas']['FailedLocSchemeOperation'];
export type FailedChallengeOperation =
    components['schemas']['FailedChallengeOperation'];
export type FailedExchangeOperation =
    components['schemas']['FailedExchangeOperation'];
export type FailedSubmitOperation =
    components['schemas']['FailedSubmitOperation'];
export type FailedDoneOperation = components['schemas']['FailedDoneOperation'];
export type FailedCredentialOperation =
    components['schemas']['FailedCredentialOperation'];
export type FailedGroupOperation =
    components['schemas']['FailedGroupOperation'];
export type FailedDelegatorOperation =
    components['schemas']['FailedDelegatorOperation'];

export type FailedOperation =
    | FailedOOBIOperation
    | FailedQueryOperation
    | FailedEndRoleOperation
    | FailedWitnessOperation
    | FailedDelegationOperation
    | FailedRegistryOperation
    | FailedLocSchemeOperation
    | FailedChallengeOperation
    | FailedExchangeOperation
    | FailedSubmitOperation
    | FailedDoneOperation
    | FailedCredentialOperation
    | FailedGroupOperation
    | FailedDelegatorOperation;

export type GenericOperation =
    | OOBIOperation
    | QueryOperation
    | EndRoleOperation
    | WitnessOperation
    | DelegationOperation
    | RegistryOperation
    | LocSchemeOperation
    | ChallengeOperation
    | ExchangeOperation
    | SubmitOperation
    | DoneOperation
    | CredentialOperation
    | GroupOperation
    | DelegatorOperation;
