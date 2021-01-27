import React from 'react';
import { MemoryRouter } from "react-router-dom"
import { action } from '@storybook/addon-actions';
import { withKnobs, button, text } from "@storybook/addon-knobs";

import { App } from './App';

import { PrestissimoApi } from '../helpers/PrestissimoApi';
import { AppContext, defaultContextValue } from './AppContext';
import { Auth0Context } from './login/Auth0Context';
import { Auth0Provider } from './login/Auth0Context';

export default {
  title: App.name,
  decorators: [withKnobs]
};

export const withNoAuthentication = () => {
  let value = {
  };

  return (
    <MemoryRouter>
      <AppContext.Provider value={value}>
        <App />
      </AppContext.Provider>
    </MemoryRouter>
  );
};

export const withMockServer = () => {
  let value = {
    ...defaultContextValue,
    uploadTrack: action('uploadTrack')
  };

  let auth0 = {
    user: {
      name: "Fake User",
      picture: "https://api.adorable.io/avatars/156/fake@fake.com.png"
    }
  };

  return (
    <MemoryRouter initialEntries={["/upload"]}>
      <Auth0Context.Provider value={auth0}>
        <AppContext.Provider value={value}>
          <App />
        </AppContext.Provider>
      </Auth0Context.Provider>
    </MemoryRouter>
  );
};

export const withLocalServer = () => {
  let api = PrestissimoApi.standard();

  const endpoint = text("endpoint", "http://localhost:3000/local");

  button("process inbox", async () => {
    action('processing-inbox')("started");

    try {
      const rsp = await fetch(`${endpoint}/restricted/debug/process-inbox`)

      const result = await rsp.json();

      action('processinig-inbox')("finished");
      action('processinig-inbox')({
        result,
      });
    } catch(e) {
    action('processinig-inbox')("failed");
    }
  });

  let value = {
    user: {
      name: "Test User",
    },
    uploadTrack: async (manifest) => {
      action("manifest")(manifest);
      try {
        // FIXME
        //

        let rsp = await fetch(`${endpoint}/api/transactions`, {
          method: "PUT",
        })
          .then(r => r.json());

        action("transaction")(rsp);

        let { upload } = rsp.data;

        manifest.userId = rsp.data.userId;
        manifest.transactionId = rsp.data.transactionId;

        action("manifest+transaction")(manifest);

        await fetch(upload.url, {
          method: upload.httpMethod,
          body: JSON.stringify(manifest),
        });

        // FIXME - Bad
        // Exponential backoff
        let MAX_RETRIES = 10;
        let MAX_TIMEOUT = 10000;
        let timeout;
        let retries = 0;
        (async function check() {
          let transactionStatus = await fetch(`${endpoint}/api/transactions/${rsp.data.transactionId}`)
            .then(r => r.json());

          let terminalStates = [
            'SUCCESS',
            'ERROR',
          ];

          if(retries >= MAX_RETRIES) {
            throw new Error("Retry limit reached!");
          }

          if(!terminalStates.includes(transactionStatus.data.item.status)) {
            retries++;
            timeout = Math.min(MAX_TIMEOUT, Math.pow(2, retries) * 2000);

            console.log(timeout);

            setTimeout(check, timeout);
          }
        })();
      } catch(e) {
        console.error(e);
        throw e;
      }
    }
  };

  return (
    <MemoryRouter initialEntries={["/upload"]}>
      <AppContext.Provider value={value}>
        <App />
      </AppContext.Provider>
    </MemoryRouter>
  );
};
