import * as url from 'url';

import * as tl from 'vsts-task-lib/task';

import { NormalizeRegistry } from './npmrcparser';
import * as util from './util';

export interface INpmRegistry {
    url: string;
    auth: string;
    authOnly: boolean;
}

export class NpmRegistry implements INpmRegistry {
    public url: string;
    public auth: string;
    public authOnly: boolean;

    constructor(url: string, auth: string, authOnly?: boolean) {
        this.url = url;
        this.auth = auth;
        this.authOnly = authOnly || false;
    }

    public static FromServiceEndpoint(endpointId: string, authOnly?: boolean): NpmRegistry {
        let email: string;
        let username: string;
        let password: string;
        let endpointAuth: tl.EndpointAuthorization;
        let url: string;
        try {
            endpointAuth = tl.getEndpointAuthorization(endpointId, false);
        } catch (exception) {
            throw new Error(tl.loc('ServiceEndpointNotDefined'));
        }

        try {
            url = NormalizeRegistry(tl.getEndpointUrl(endpointId, false));
        } catch (exception) {
            throw new Error(tl.loc('ServiceEndpointUrlNotDefined'));
        }

        switch (endpointAuth.scheme) {
            case 'UsernamePassword':
                username = endpointAuth.parameters['username'];
                password = endpointAuth.parameters['password'];
                email = username; // npm needs an email to be set in order to publish, this is ignored on npmjs
                break;
            case 'Token':
                email = 'VssEmail';
                username = 'VssToken';
                password = endpointAuth.parameters['apitoken'];
                break;
        }

        let nerfed = util.toNerfDart(url);
        let auth = `${nerfed}:username=${username}
                    ${nerfed}:_password=${new Buffer(password).toString('base64')}
                    ${nerfed}:email=${email}
                    ${nerfed}:always-auth=true`;

        return new NpmRegistry(url, auth, authOnly);
    }

    public static async FromFeedId(feedId: string, authOnly?: boolean): Promise<NpmRegistry> {
        let url = NormalizeRegistry(await util.getFeedRegistryUrl(feedId));
        let nerfed = util.toNerfDart(url);
        let auth = `${nerfed}:_authToken=${util.getSystemAccessToken()}`;

        return new NpmRegistry(url, auth, authOnly);
    }
}
