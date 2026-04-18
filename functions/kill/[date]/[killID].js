export async function onRequest(context) {
    const { killID } = context.params;
    return Response.redirect(`https://socketkill.com/kill/${killID}`, 301);
}