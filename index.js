import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";
import Imap from "imap";
import { simpleParser } from "mailparser";

const EMAIL = "miguelhmartins870@gmail.com";
const PASSWORD = "miguel1020";

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on("creds.update", saveCreds);

    lerEmails((pedido) => {
        console.log("Novo orçamento:", pedido);

        // enviar mensagem para a pessoa
        sock.sendMessage(pedido.numero + "@s.whatsapp.net", {
            text: `Olá ${pedido.nome}!\nRecebi sua solicitação de orçamento.\nQual horário é melhor para te atender?`
        });
    });
}

function lerEmails(callback) {
    const imap = new Imap({
        user: EMAIL,
        password: PASSWORD,
        host: "imap.gmail.com",
        port: 993,
        tls: true
    });

    imap.once("ready", () => {
        imap.openBox("INBOX", false, () => {
            imap.on("mail", () => {
                buscarNovosEmails(imap, callback);
            });

            buscarNovosEmails(imap, callback);
        });
    });

    imap.connect();
}

function buscarNovosEmails(imap, callback) {
    imap.search(["UNSEEN"], (err, results) => {
        if (!results || results.length === 0) return;

        const f = imap.fetch(results, { bodies: "" });

        f.on("message", (msg) => {
            msg.on("body", (stream) => {
                simpleParser(stream, (err, mail) => {
                    if (!mail.from.text.includes("formsubmit")) return;

                    const corpo = mail.text;

                    const nome = extrair(corpo, "nome");
                    const numero = extrair(corpo, "numero");
                    const endereco = extrair(corpo, "endereco");
                    const descricao = extrair(corpo, "descricao");

                    callback({
                        nome,
                        numero,
                        endereco,
                        descricao
                    });
                });
            });
        });
    });
}

function extrair(texto, campo) {
    const regex = new RegExp(`${campo}\\s*\\n\\s*(.*)`, "i");
    const m = regex.exec(texto);
    return m ? m[1].trim() : "";
}


startBot();
