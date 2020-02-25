// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/authentication
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {UserProfile} from '@loopback/security';

/**
 * An interface for generating and verifying a token
 */
export interface TokenService {
  /**
   * Verifies the validity of a token string and returns a user profile
   *
   * @param token The token/secret which should be validated/verified.
   * @param userProfile Depending on the token system this optional parameter
   *   can be used to check if the token is valid for the given user.
   *
   * @returns The UserProfile which belongs to the given token.
   */
  verifyToken(token: string, userProfile?: UserProfile): Promise<UserProfile>;

  /**
   * Generates a token string based on a user profile
   *
   * @param userProfile A UserProfile for which a token should be generated.
   *
   * @returns a generated token/secret for a given UserProfile.
   */
  generateToken(userProfile: UserProfile): Promise<string>;

  /**
   * Revokes a given token (if supported by token system)
   *
   * @param token The token/secret which should be revoked/invalidated.
   * @param userProfile An optional UserProfile to check if the token
   *   is valid for a given User.
   *
   * @returns true, if the given token was invalidated.
   */
  revokeToken?(token: string, userProfile?: UserProfile): Promise<boolean>;
}
