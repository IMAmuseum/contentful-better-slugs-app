const mockCma: any = () =>  {
    return {
        contentType: {
            getMany: jest.fn().mockReturnValue({items: []})
        }
    };
};

export { mockCma };
