"use client";

import React, { useEffect, useState } from "react";
import { SignIdentity } from "@dfinity/agent";
import { IdleOptions, LocalStorage } from "@dfinity/auth-client";
import { NFID } from "@nfid/embed";

export function Playground() {
  type NFIDConfig = {
    origin?: string;
    application?: {
      name?: string;
      logo?: string;
    };
    identity?: SignIdentity;
    keyType?: "ECDSA" | "Ed25519";
    idleOptions?: IdleOptions;
  };

  const [nfid, setNfid] = useState<null | any>(null);
  const [info, setInfo] = useState("");
  const [signedPrincipal, setSignedPrincipal] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [sign, setSign] = useState("");
  const [pubkey, setPubkey] = useState("");
  const [verif, setVerif] = useState(false);

  useEffect(() => {
    async function initializeNFID() {
      try {
        const nfidInstance = await NFID.init({
          application: {
            name: "NFID Playground",
            logo: "https://dev.nfid.one/static/media/id.300eb72f3335b50f5653a7d6ad5467b3.svg",
          },
        } as NFIDConfig);
        setNfid(nfidInstance);
        setIsAuthenticated(nfidInstance.isAuthenticated);
        const res = nfidInstance.getIdentity();
        setInfo(JSON.stringify(res));
      } catch (error) {
        console.error("Failed to initialize NFID:", error);
      }
    }

    initializeNFID();
  }, []);

  const handleLogout = async () => {
    if (nfid) {
      await nfid.logout();
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async () => {
    if (nfid) {
      nfid.getDelegation({});
      setIsAuthenticated(true);
    }
  };

  const handleGetDelegation = async () => {
    if (nfid && nfid.isAuthenticated) {
      const res = nfid.getIdentity();
      setInfo(JSON.stringify(res));
      console.log(res);
    }
  };

  function arrayBufferToHex(buffer: any) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  const handleGetPrivateKey = async () => {
    const request = indexedDB.open("nfid-auth-client-db", 1);
    const encoder = new TextEncoder();
    const algorithm = {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    };

    request.onsuccess = function (event: any) {
      const db = event.target.result;

      // Начинаем новую транзакцию для чтения из хранилища данных "myObjectStore"
      const transaction = db.transaction(["ic-keyval"], "readonly");

      // Получаем ссылку на хранилище данных
      const objectStore = transaction.objectStore("ic-keyval");

      // Извлекаем объект с ключом
      const getRequest = objectStore.get("identity");

      getRequest.onerror = function (event: any) {
        console.error("Ошибка получения объекта:", event.target.errorCode);
      };

      getRequest.onsuccess = function (event: any) {
        const data = event.target.result;

        if (data) {
          const json = JSON.parse(info);
          const { privateKey } = data;
          const uint8Array = encoder.encode(json._principal.__principal__);
          const principal = uint8Array.buffer;
          window.crypto.subtle
            .sign(algorithm, privateKey, principal)
            .then((res) => {
              const text = arrayBufferToHex(res);
              setSignedPrincipal(text);
            });
        } else {
          console.log("Объект с таким ключом не найден.");
        }
      };
    };
  };

  const isVerifyHandler = async () => {
    const json = JSON.parse(info);
    const publicKeyBuffer = new Uint8Array(Buffer.from(pubkey, "hex"));

    const signatureBuffer = new Uint8Array(Buffer.from(sign, "hex"));
    const dataBuffer = new TextEncoder().encode(json._principal.__principal__);

    try {
      const publicKey = await crypto.subtle.importKey(
        "spki",
        publicKeyBuffer,
        {
          name: "ECDSA",
          namedCurve: "P-256",
        },
        true,
        ["verify"]
      );

      const isVerified = await crypto.subtle.verify(
        {
          name: "ECDSA",
          hash: { name: "SHA-256" },
        },
        publicKey,
        signatureBuffer,
        dataBuffer
      );

      setVerif(isVerified);
    } catch (err: any) {
      setVerif(false);
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div>
        {isAuthenticated ? (
          <div className="flex flex-row gap-20">
            <button
              className="p-6 bg-red-500 rounded-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
            <button
              className="p-6 bg-green-500 rounded-sm"
              onClick={handleGetDelegation}
            >
              Get Delegation
            </button>
            <button
              className="p-6 bg-blue-500 rounded-sm"
              onClick={handleGetPrivateKey}
            >
              Sign
            </button>
          </div>
        ) : (
          <button className="p-6 bg-blue-500 rounded-sm" onClick={handleLogin}>
            Connect NFID
          </button>
        )}
      </div>
      <div className="flex flex-col gap-6 mt-10">
        <p>Delegation</p>
        <textarea
          className="text-black rounded-md w-96 h-32 p-6"
          disabled={true}
          value={info}
        />
      </div>
      <div className="flex flex-col gap-6 mt-10">
        <p>Signed principal</p>
        <textarea
          className="text-black rounded-md w-96 h-32 p-6"
          disabled={true}
          value={signedPrincipal}
        />
      </div>
      <div className="flex flex-col gap-6 mt-6 items-center">
        <p>Compare sign</p>
        <div className="flex flex-row gap-6">
          <textarea
            placeholder="sign"
            className="text-black rounded-md w-96 h-32 p-6"
            value={sign}
            onChange={(e) => setSign(e.target.value)}
          ></textarea>
          <textarea
            placeholder="public key"
            className="text-black rounded-md w-96 h-32 p-6"
            value={pubkey}
            onChange={(e) => setPubkey(e.target.value)}
          ></textarea>
        </div>
        <button
          className="p-6 bg-green-500 rounded-sm max-w-24"
          onClick={isVerifyHandler}
        >
          Verify
        </button>
        <div className={`p-3 text-sm ${verif ? "bg-green-500" : "bg-red-500"}`}>
          {verif ? "True" : "False"}
        </div>
      </div>
    </div>
  );
}
